'use client';

import React, { useState, useTransition } from 'react';
import { Users, ArrowRight } from 'lucide-react';
import { Restaurant, RestaurantTable, TableGuest } from '@/types/database';
import { joinOrCreateTableSession } from '@/app/r/[slug]/actions';
import { BottomSheet } from '@/components/ui/bottom-sheet';

// Joining is a required step, so the sheet is never dismissed from the outside.
const noop = () => {};

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
        <BottomSheet
            open={isOpen}
            onClose={noop}
            dismissible={false}
            label="Join this table"
            placement="adaptive"
            className="max-w-md"
            contentClassName="p-6 sm:p-7 space-y-5"
        >
            {/* Brand and table */}
            <div className="space-y-2 text-center">
                <div className="mx-auto flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-brand font-display text-2xl font-semibold text-brand-foreground shadow-md ring-1 ring-black/5">
                    {restaurant.logo_url ? (
                        <img
                            src={restaurant.logo_url}
                            alt=""
                            width={64}
                            height={64}
                            className="size-full rounded-2xl object-cover"
                        />
                    ) : (
                        restaurant.name.charAt(0).toUpperCase()
                    )}
                </div>

                <div>
                    <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                        <span>{table.display_name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{table.table_code}</span>
                    </p>
                    <h2 className="font-display text-2xl leading-tight font-semibold tracking-tight text-balance text-foreground">
                        Welcome to {restaurant.name}
                    </h2>
                    <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-pretty text-muted-foreground">
                        Browse the digital menu, add dishes to the live shared table cart, and order together.
                    </p>
                </div>
            </div>

            {/* Tablemates already seated */}
            {existingGuests.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-border bg-muted/50 p-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <Users aria-hidden="true" className="size-3.5" />
                        <span>Already seated at this table:</span>
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                        {existingGuests.map((g) => (
                            <li
                                key={g.guest_id}
                                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs"
                            >
                                <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-600" />
                                {g.name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Name form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label
                        htmlFor="guestName"
                        className="mb-1.5 block text-xs font-bold tracking-wider text-foreground uppercase"
                    >
                        What should we call you? *
                    </label>
                    <input
                        id="guestName"
                        name="guestName"
                        type="text"
                        required
                        autoComplete="given-name"
                        spellCheck={false}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Priya, Alex…"
                        maxLength={30}
                        className="h-12 w-full rounded-xl border border-border bg-muted/40 px-4 text-base font-medium text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
                    />
                </div>

                {error && (
                    <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-700">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-brand-foreground shadow-md transition-transform active:scale-[0.98] disabled:opacity-60"
                >
                    {isPending ? (
                        <>
                            <span
                                aria-hidden="true"
                                className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
                            />
                            <span>Joining Table…</span>
                        </>
                    ) : (
                        <>
                            <span>Join Table & Browse Menu</span>
                            <ArrowRight aria-hidden="true" className="size-4" />
                        </>
                    )}
                </button>
            </form>
        </BottomSheet>
    );
}
