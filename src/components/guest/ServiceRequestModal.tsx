'use client';

import React, { useState, useTransition } from 'react';
import { Droplet, Utensils, Bell, Receipt, Check, X, AlertCircle } from 'lucide-react';
import { RequestType, RestaurantTable } from '@/types/database';
import { createServiceRequest } from '@/app/r/[slug]/actions';
import { BottomSheet } from '@/components/ui/bottom-sheet';

interface ServiceRequestModalProps {
    restaurantId: string;
    table: RestaurantTable;
    sessionId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

const SERVICE_PRESETS: { type: RequestType; label: string; desc: string; icon: React.ElementType }[] = [
    { type: 'WATER', label: 'Drinking Water', desc: 'Request water bottle or fresh glasses', icon: Droplet },
    { type: 'NAPKINS', label: 'Napkins & Cutlery', desc: 'Extra forks, spoons, or tissue napkins', icon: Utensils },
    { type: 'WAITER', label: 'Call Server', desc: 'Need help or want to speak with staff', icon: Bell },
    { type: 'BILL', label: 'Request Bill', desc: 'Ask server to bring physical bill or card machine', icon: Receipt },
];

export function ServiceRequestModal({
    restaurantId,
    table,
    sessionId,
    isOpen,
    onClose,
}: ServiceRequestModalProps) {
    const [selectedType, setSelectedType] = useState<RequestType | null>(null);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSendRequest = (type: RequestType) => {
        setSelectedType(type);
        setError(null);

        startTransition(async () => {
            const res = await createServiceRequest(restaurantId, table.id, sessionId, type);
            if (res.success) {
                setIsSent(true);
                setTimeout(() => {
                    setIsSent(false);
                    setSelectedType(null);
                    onClose();
                }, 1800);
            } else {
                setError(res.error || 'Failed to alert staff. Please try again.');
            }
        });
    };

    return (
        <BottomSheet
            open={isOpen}
            onClose={onClose}
            label="Request service at your table"
            placement="adaptive"
            className="max-w-md"
            contentClassName="px-6 pb-6 pt-1 sm:pt-6 space-y-4"
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close service request modal"
            >
                <X aria-hidden="true" className="size-5" />
            </button>

            <div className="pr-10">
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Floor Service · {table.display_name}
                </p>
                <h2 className="font-display text-xl leading-tight font-semibold tracking-tight text-balance text-foreground">
                    Need Service at Your Table?
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Tap any request to alert your floor server instantly.</p>
            </div>

            {isSent ? (
                <div role="status" className="animate-fadeIn space-y-2 rounded-2xl border border-emerald-600/20 bg-emerald-500/10 p-6 text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-700 text-white shadow-md">
                        <Check aria-hidden="true" className="size-6 stroke-[3]" />
                    </div>
                    <h3 className="text-base font-bold text-emerald-800">Server Notified!</h3>
                    <p className="text-sm text-emerald-900">
                        A floor captain has received your alert for {table.display_name}.
                    </p>
                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-2.5">
                    {SERVICE_PRESETS.map((preset) => {
                        const Icon = preset.icon;
                        const isCurrent = isPending && selectedType === preset.type;

                        return (
                            <li key={preset.type}>
                                <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => handleSendRequest(preset.type)}
                                    className="flex min-h-16 w-full items-center gap-3.5 rounded-2xl border border-border bg-muted/40 p-3.5 text-left transition-colors hover:border-foreground/20 hover:bg-muted active:scale-[0.98] disabled:opacity-50"
                                >
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-xs ring-1 ring-black/5">
                                        <Icon aria-hidden="true" className="size-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground">{preset.label}</p>
                                        <p className="text-xs text-muted-foreground">{preset.desc}</p>
                                    </div>
                                    {isCurrent && (
                                        <span
                                            aria-hidden="true"
                                            className="size-4 shrink-0 animate-spin rounded-full border-2 border-zinc-400 border-t-foreground"
                                        />
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {error && (
                <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-700"
                >
                    <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </BottomSheet>
    );
}
