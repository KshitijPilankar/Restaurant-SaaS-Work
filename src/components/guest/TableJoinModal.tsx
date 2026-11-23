'use client';

import React, { useState, useTransition } from 'react';
import { Utensils, Users, Sparkles, ArrowRight } from 'lucide-react';
import { Restaurant, RestaurantTable, TableGuest } from '@/types/database';
import { joinOrCreateTableSession } from '@/app/r/[slug]/actions';

interface TableJoinModalProps {
    restaurant: Restaurant;
    table: RestaurantTable;
    existingGuests: TableGuest[];
    isOpen: boolean;
    onJoined: (guestId: string, guestName: string, sessionId: string) => void;
}

export function TableJoinModal({
    restaurant,
    table,
    existingGuests,
    isOpen,
    onJoined,
}: TableJoinModalProps) {
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const trimmed = name.trim();
        if (!trimmed) {
            setError('Please enter your name to start ordering.');
            return;
        }

        startTransition(async () => {
            const res = await joinOrCreateTableSession(restaurant.id, table.id, trimmed);
            if (res.success && res.data) {
                onJoined(res.data.guestId, res.data.guestName, res.data.sessionId);
            } else {
                setError(res.error || 'Unable to join table. Please try again.');
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-card rounded-t-[28px] sm:rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-slideUp border-t sm:border border-border">
                {/* Tactile Grab Handle */}
                <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto -mt-2 mb-2 sm:hidden shrink-0" />

                {/* Brand / Table Header */}
                <div className="text-center space-y-2">
                    <div
                        className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md font-bold text-xl overflow-hidden ring-1 ring-black/5"
                        style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                        {restaurant.logo_url ? (
                            <img
                                src={restaurant.logo_url}
                                alt={restaurant.name}
                                className="w-full h-full object-cover rounded-2xl"
                            />
                        ) : (
                            restaurant.name.charAt(0).toUpperCase()
                        )}
                    </div>

                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-foreground border border-border mb-1.5">
                            <span>{table.display_name}</span>
                            <span>•</span>
                            <span className="font-mono">{table.table_code}</span>
                        </div>
                        <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                            Welcome to {restaurant.name}
                        </h2>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1 leading-relaxed">
                            Browse the digital menu, add dishes to the live shared table cart, and order together.
                        </p>
                    </div>
                </div>

                {/* Existing Tablemates info */}
                {existingGuests.length > 0 && (
                    <div className="p-3.5 bg-muted/50 border border-border rounded-2xl space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Already seated at this table:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {existingGuests.map((g) => (
                                <span
                                    key={g.guest_id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-card border border-border text-foreground shadow-2xs"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {g.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Name Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="guestName"
                            className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5"
                        >
                            What should we call you? *
                        </label>
                        <input
                            id="guestName"
                            type="text"
                            required
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Kshitij, Priya, Alex"
                            maxLength={30}
                            className="w-full px-4 py-3 bg-muted/40 border border-border focus:border-foreground/40 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-base font-medium transition"
                            style={{
                                outlineColor: 'var(--brand-primary)',
                            }}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-md active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                        {isPending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Joining Table...</span>
                            </>
                        ) : (
                            <>
                                <span>Join Table & Browse Menu</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
