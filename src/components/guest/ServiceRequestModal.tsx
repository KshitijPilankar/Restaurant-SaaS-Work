'use client';

import React, { useState, useTransition } from 'react';
import { Droplet, Utensils, Bell, Receipt, Check, X, AlertCircle } from 'lucide-react';
import { RequestType, RestaurantTable } from '@/types/database';
import { createServiceRequest } from '@/app/r/[slug]/actions';

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

    if (!isOpen) return null;

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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 animate-slideUp relative">
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-1 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
                >
                    <X className="w-5 h-5" />
                </button>

                <div>
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400">
                        Floor Service • {table.display_name}
                    </span>
                    <h3 className="text-lg font-bold text-zinc-900">Need Service at Your Table?</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        Tap any request to alert your floor server instantly.
                    </p>
                </div>

                {isSent ? (
                    <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 animate-fadeIn">
                        <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                            <Check className="w-6 h-6 stroke-[3]" />
                        </div>
                        <h4 className="font-bold text-emerald-900 text-base">Server Notified!</h4>
                        <p className="text-xs text-emerald-700">
                            A floor captain has received your alert for {table.display_name}.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                        {SERVICE_PRESETS.map((preset) => {
                            const Icon = preset.icon;
                            const isCurrent = isPending && selectedType === preset.type;

                            return (
                                <button
                                    key={preset.type}
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => handleSendRequest(preset.type)}
                                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-zinc-200 hover:border-zinc-300 bg-zinc-50/60 hover:bg-zinc-100/70 transition text-left cursor-pointer active:scale-[0.99] disabled:opacity-50"
                                >
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                                        style={{ backgroundColor: 'var(--brand-primary)' }}
                                    >
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-zinc-900">{preset.label}</h4>
                                        <p className="text-xs text-zinc-500 truncate">{preset.desc}</p>
                                    </div>
                                    {isCurrent && (
                                        <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
