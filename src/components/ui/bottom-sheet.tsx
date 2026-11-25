'use client';

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';

/**
 * Shared accessible bottom sheet for guest drawers and modals.
 *
 * - Real dialog semantics (role="dialog", aria-modal, labelled) with a focus trap,
 *   Escape to close, background inerting, scroll lock and focus return, via Base UI.
 * - Backdrop press closes it.
 * - Drag the grab handle down to dismiss (distance or flick velocity); otherwise it snaps back.
 * - `placement="adaptive"` is a bottom sheet on phones and a centered modal from 640px up
 *   (drag is only active while it is a sheet).
 * - `dismissible={false}` is for a required step (e.g. entering your name): no handle,
 *   no drag, no Escape, no backdrop dismissal.
 *
 * The sheet renders into a node placed right where <BottomSheet> is used, not into <body>,
 * so tenant CSS variables such as --brand-primary keep inheriting.
 * Presentation only: it owns no business logic.
 */

const DISMISS_DISTANCE_PX = 120;
const DISMISS_VELOCITY_PX_PER_MS = 0.6;
const MIN_FLICK_DISTANCE_PX = 24;
const SETTLE_MS = 200;

const WIDE_QUERY = '(min-width: 640px)';

function subscribeWide(onChange: () => void) {
    const mql = window.matchMedia(WIDE_QUERY);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
}

function useIsWide(): boolean {
    return useSyncExternalStore(
        subscribeWide,
        () => window.matchMedia(WIDE_QUERY).matches,
        () => false
    );
}

export interface BottomSheetProps {
    open: boolean;
    /** Called when the user dismisses the sheet (Escape, backdrop press, drag, or your own close button). */
    onClose: () => void;
    /** Accessible name announced by screen readers. Keep it short, e.g. "Shared table cart". */
    label: string;
    children: React.ReactNode;
    /** `bottom`: always a bottom sheet. `adaptive`: bottom sheet on phones, centered modal from 640px. */
    placement?: 'bottom' | 'adaptive';
    /** Set false for a required step: no handle, drag, Escape or backdrop dismissal. Default true. */
    dismissible?: boolean;
    /** Grab handle in the normal flow (default) or overlaid on top of an image header. */
    handle?: 'inline' | 'overlay';
    /** Handle color: `default` for light surfaces, `light` over photos. */
    handleTone?: 'default' | 'light';
    /** Classes for the panel (max width/height, overflow, extra surface styling). */
    className?: string;
    /** Classes for the wrapper around children (padding, spacing, scroll layout). */
    contentClassName?: string;
    /** Stacking class for backdrop and panel. Default `z-50`. */
    zIndexClassName?: string;
    /** Override the default dimmed, blurred backdrop. */
    backdropClassName?: string;
}

export function BottomSheet({
    open,
    onClose,
    label,
    children,
    placement = 'bottom',
    dismissible = true,
    handle = 'inline',
    handleTone = 'default',
    className,
    contentClassName,
    zIndexClassName = 'z-50',
    backdropClassName = 'bg-black/60 backdrop-blur-sm',
}: BottomSheetProps) {
    const [container, setContainer] = useState<HTMLDivElement | null>(null);
    const isWide = useIsWide();
    const adaptive = placement === 'adaptive';
    const asSheet = !adaptive || !isWide;
    const dragEnabled = dismissible && asSheet;

    const popupRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ startY: number; startT: number; dy: number } | null>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        };
    }, []);

    const handlePointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!dragEnabled || !popupRef.current) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            dragRef.current = { startY: e.clientY, startT: performance.now(), dy: 0 };
            popupRef.current.style.transition = 'none';
            if (backdropRef.current) backdropRef.current.style.transition = 'none';
        },
        [dragEnabled]
    );

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        const popup = popupRef.current;
        if (!drag || !popup) return;
        const dy = Math.max(0, e.clientY - drag.startY);
        drag.dy = dy;
        popup.style.transform = `translateY(${dy}px)`;
        if (backdropRef.current) {
            backdropRef.current.style.opacity = String(Math.max(0, 1 - dy / (popup.offsetHeight || 1)));
        }
    }, []);

    const finishDrag = useCallback(
        (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
            const drag = dragRef.current;
            const popup = popupRef.current;
            const backdrop = backdropRef.current;
            dragRef.current = null;
            if (!drag || !popup) return;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }

            const elapsed = Math.max(1, performance.now() - drag.startT);
            const velocity = drag.dy / elapsed;
            const dismiss =
                !cancelled &&
                (drag.dy > DISMISS_DISTANCE_PX ||
                    (velocity > DISMISS_VELOCITY_PX_PER_MS && drag.dy > MIN_FLICK_DISTANCE_PX));

            const settle = `${SETTLE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`;
            popup.style.transition = `transform ${settle}`;
            if (backdrop) backdrop.style.transition = `opacity ${settle}`;

            if (dismiss) {
                popup.style.transform = 'translateY(100%)';
                if (backdrop) backdrop.style.opacity = '0';
                timerRef.current = window.setTimeout(onClose, SETTLE_MS);
            } else {
                popup.style.transform = '';
                if (backdrop) backdrop.style.opacity = '';
                timerRef.current = window.setTimeout(() => {
                    popup.style.transition = '';
                    if (backdrop) backdrop.style.transition = '';
                }, SETTLE_MS);
            }
        },
        [onClose]
    );

    const showHandle = dismissible;

    return (
        <>
            <div ref={setContainer} />
            {container && (
                <Dialog.Root
                    open={open}
                    modal
                    disablePointerDismissal={!dismissible}
                    onOpenChange={(next) => {
                        if (!next && dismissible) onClose();
                    }}
                >
                    <Dialog.Portal container={container}>
                        <Dialog.Backdrop
                            ref={backdropRef}
                            className={cn(
                                'fixed inset-0 opacity-100 transition-opacity duration-200',
                                'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
                                zIndexClassName,
                                backdropClassName
                            )}
                        />
                        <Dialog.Viewport
                            className={cn(
                                'pointer-events-none fixed inset-0 flex items-end justify-center',
                                adaptive && 'sm:items-center sm:p-4',
                                zIndexClassName
                            )}
                        >
                            <Dialog.Popup
                                ref={popupRef}
                                aria-label={label}
                                className={cn(
                                    'pointer-events-auto relative flex w-full flex-col overflow-hidden border-t border-border bg-card shadow-2xl outline-none',
                                    'rounded-t-[28px]',
                                    'transition-[translate,opacity] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
                                    'data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full',
                                    adaptive &&
                                        'sm:rounded-3xl sm:border sm:data-[starting-style]:translate-y-4 sm:data-[ending-style]:translate-y-4 sm:data-[starting-style]:opacity-0 sm:data-[ending-style]:opacity-0',
                                    className
                                )}
                            >
                                {showHandle && (
                                    <div
                                        aria-hidden
                                        onPointerDown={handlePointerDown}
                                        onPointerMove={handlePointerMove}
                                        onPointerUp={(e) => finishDrag(e, false)}
                                        onPointerCancel={(e) => finishDrag(e, true)}
                                        className={cn(
                                            'flex shrink-0 touch-none select-none justify-center',
                                            handle === 'overlay'
                                                ? 'absolute inset-x-0 top-0 z-20 h-8 pt-2.5'
                                                : 'h-7 pt-2.5',
                                            dragEnabled && 'cursor-grab active:cursor-grabbing',
                                            adaptive && 'sm:hidden'
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'block h-1.5 w-12 rounded-full',
                                                handleTone === 'light'
                                                    ? 'bg-white/70 drop-shadow'
                                                    : 'bg-zinc-300 dark:bg-zinc-700'
                                            )}
                                        />
                                    </div>
                                )}
                                <div className={cn('flex min-h-0 flex-1 flex-col', contentClassName)}>
                                    {children}
                                </div>
                            </Dialog.Popup>
                        </Dialog.Viewport>
                    </Dialog.Portal>
                </Dialog.Root>
            )}
        </>
    );
}
