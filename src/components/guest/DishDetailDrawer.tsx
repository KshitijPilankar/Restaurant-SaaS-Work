'use client';

import React, { useState, useTransition } from 'react';
import { X, Plus, Minus, Flame, AlertCircle, Check, Clock, Star } from 'lucide-react';
import { MenuItem, DishVariant } from '@/types/database';
import { addToSharedCart } from '@/app/r/[slug]/actions';
import { BottomSheet } from '@/components/ui/bottom-sheet';

interface DishDetailDrawerProps {
    dish: MenuItem | null;
    restaurantId: string;
    sessionId: string;
    guestId: string;
    guestName: string;
    isOpen: boolean;
    onClose: () => void;
    onItemAdded?: () => void;
}

export function DishDetailDrawer({
    dish,
    restaurantId,
    sessionId,
    guestId,
    guestName,
    isOpen,
    onClose,
    onItemAdded,
}: DishDetailDrawerProps) {
    const [selectedVariant, setSelectedVariant] = useState<DishVariant | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    // Reset each time the drawer opens. The parent keeps `dish` after closing so the
    // sheet can finish its exit animation with its content intact.
    React.useEffect(() => {
        if (dish && isOpen) {
            const defaultVar = (dish.variants && dish.variants.length > 0) ? dish.variants[0] : null;
            setSelectedVariant(defaultVar);
            setQuantity(1);
            setNotes('');
            setError(null);
        }
    }, [dish, isOpen]);

    if (!dish) return null;

    const basePrice = Number(dish.base_price) || 0;
    const delta = selectedVariant ? Number(selectedVariant.price_delta) || 0 : 0;
    const unitPrice = basePrice + delta;
    const totalPrice = unitPrice * quantity;
    const hasSpice = dish.spice && dish.spice !== 'NONE';
    const hasAllergens = !!dish.allergens && dish.allergens.length > 0;

    const handleAddToCart = () => {
        setError(null);

        startTransition(async () => {
            const res = await addToSharedCart({
                restaurantId,
                sessionId,
                menuItemId: dish.id,
                addedByGuestId: guestId,
                addedByName: guestName,
                variantName: selectedVariant?.name || null,
                unitPrice,
                quantity,
                notes: notes.trim() || null,
            });

            if (res.success) {
                onItemAdded?.();
                onClose();
            } else {
                setError(res.error || 'Failed to add item to table cart.');
            }
        });
    };

    return (
        <BottomSheet
            open={isOpen}
            onClose={onClose}
            label={`Customize ${dish.name}`}
            handle="overlay"
            handleTone="light"
            className="max-w-md max-h-[92vh]"
        >
            {/* Close (44px target, floats over the photo) */}
            <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 z-20 flex size-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-black/70 active:scale-95"
                aria-label="Close dish customization"
            >
                <X aria-hidden="true" className="size-5" />
            </button>

            {/* Hero photo */}
            <div className="relative h-56 w-full shrink-0 bg-muted">
                {dish.image_url ? (
                    <img
                        src={dish.image_url}
                        alt=""
                        width={448}
                        height={224}
                        decoding="async"
                        className="size-full object-cover"
                    />
                ) : (
                    <div
                        aria-hidden="true"
                        className="flex size-full items-center justify-center bg-brand-subtle font-display text-6xl font-semibold text-muted-foreground/60"
                    >
                        {dish.name.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />

                <span
                    role="img"
                    aria-label={dish.is_veg ? 'Vegetarian' : 'Non-vegetarian'}
                    className={`absolute bottom-3 left-4 flex size-5 items-center justify-center rounded-[3px] border-2 bg-card shadow-xs ${
                        dish.is_veg ? 'border-emerald-700' : 'border-red-700'
                    }`}
                >
                    <span className={`size-2.5 rounded-full ${dish.is_veg ? 'bg-emerald-700' : 'bg-red-700'}`} />
                </span>
            </div>

            {/* Details */}
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="font-display text-2xl leading-tight font-semibold tracking-tight text-balance text-foreground">
                            {dish.name}
                        </h2>
                        <p className="pt-1 font-mono text-xl font-bold text-foreground tabular-nums">₹{unitPrice}</p>
                    </div>

                    {(dish.is_bestseller || hasSpice || dish.prep_time_mins) && (
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
                            {dish.is_bestseller && (
                                <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                                    <Star aria-hidden="true" className="size-3.5 fill-current" />
                                    Bestseller
                                </span>
                            )}
                            {hasSpice && (
                                <span className="inline-flex items-center gap-1 text-red-700">
                                    <Flame aria-hidden="true" className="size-3.5" />
                                    <span className="capitalize">{dish.spice.toLowerCase()} spice</span>
                                </span>
                            )}
                            {dish.prep_time_mins ? (
                                <span className="inline-flex items-center gap-1">
                                    <Clock aria-hidden="true" className="size-3.5" />
                                    About {dish.prep_time_mins} min
                                </span>
                            ) : null}
                        </p>
                    )}

                    {dish.description && (
                        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{dish.description}</p>
                    )}

                    {hasAllergens && (
                        <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Contains:</span>{' '}
                            {dish.allergens.join(', ')}
                        </p>
                    )}
                </div>

                {/* Portion options */}
                {dish.variants && dish.variants.length > 0 && (
                    <div role="group" aria-labelledby="dish-portion-label" className="space-y-2 border-t border-border/70 pt-4">
                        <p id="dish-portion-label" className="text-xs font-bold tracking-wider text-foreground uppercase">
                            Choose a Portion
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {dish.variants.map((v) => {
                                const isSelected = selectedVariant?.name === v.name;
                                const varPrice = basePrice + Number(v.price_delta);

                                return (
                                    <button
                                        key={v.name}
                                        type="button"
                                        onClick={() => setSelectedVariant(v)}
                                        aria-pressed={isSelected}
                                        className={`flex min-h-14 items-center justify-between gap-2 rounded-xl border-2 px-3.5 py-2.5 text-left transition-colors active:scale-[0.98] ${
                                            isSelected
                                                ? 'border-brand bg-brand-subtle'
                                                : 'border-border bg-card hover:border-foreground/25'
                                        }`}
                                    >
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold text-foreground">{v.name}</span>
                                            <span className="block font-mono text-xs font-bold text-muted-foreground tabular-nums">
                                                ₹{varPrice}
                                            </span>
                                        </span>
                                        {isSelected && <Check aria-hidden="true" className="size-4 shrink-0 text-foreground" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Kitchen note */}
                <div className="space-y-1.5 border-t border-border/70 pt-4">
                    <label htmlFor="dish-notes" className="block text-xs font-bold tracking-wider text-foreground uppercase">
                        Note for the Kitchen (Optional)
                    </label>
                    <input
                        id="dish-notes"
                        name="notes"
                        type="text"
                        autoComplete="off"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Less spicy, dressing on the side…"
                        maxLength={100}
                        className="h-11 w-full rounded-xl border border-border bg-muted/40 px-3.5 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
                    />
                </div>

                {error && (
                    <div
                        role="alert"
                        className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-700"
                    >
                        <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Sticky action bar */}
            <div className="flex shrink-0 items-center gap-3 border-t border-border bg-card p-4 pb-safe shadow-lg">
                <div className="flex items-center rounded-xl border border-border bg-muted p-1">
                    <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="flex size-11 items-center justify-center rounded-lg text-foreground transition hover:bg-card active:scale-90 disabled:opacity-30"
                        aria-label="Decrease quantity"
                    >
                        <Minus aria-hidden="true" className="size-4" />
                    </button>
                    <span
                        aria-live="polite"
                        className="w-8 text-center font-mono text-base font-extrabold text-foreground tabular-nums"
                    >
                        {quantity}
                    </span>
                    <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="flex size-11 items-center justify-center rounded-lg text-foreground transition hover:bg-card active:scale-90"
                        aria-label="Increase quantity"
                    >
                        <Plus aria-hidden="true" className="size-4" />
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isPending}
                    className="flex h-12 flex-1 items-center justify-between rounded-xl bg-brand px-4 text-sm font-bold text-brand-foreground shadow-md transition-transform active:scale-[0.98] disabled:opacity-60"
                >
                    <span>{isPending ? 'Adding…' : 'Add to Table Cart'}</span>
                    <span className="font-mono tabular-nums">₹{totalPrice}</span>
                </button>
            </div>
        </BottomSheet>
    );
}
