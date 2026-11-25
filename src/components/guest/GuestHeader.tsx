'use client';

import React, { useState } from 'react';
import { Wifi, Bell, Users, Copy, Check, X } from 'lucide-react';
import { Restaurant, RestaurantTable, TableGuest } from '@/types/database';
import { ServiceRequestModal } from '@/components/guest/ServiceRequestModal';
import { BottomSheet } from '@/components/ui/bottom-sheet';

interface GuestHeaderProps {
    restaurant: Restaurant;
    table: RestaurantTable;
    sessionId: string | null;
    guests: TableGuest[];
    currentGuestName: string | null;
}

export function GuestHeader({
    restaurant,
    table,
    sessionId,
    guests,
    currentGuestName,
}: GuestHeaderProps) {
    const [showWifi, setShowWifi] = useState(false);
    const [showGuests, setShowGuests] = useState(false);
    const [showService, setShowService] = useState(false);
    const [copiedPass, setCopiedPass] = useState(false);

    const handleCopyWifi = () => {
        if (!restaurant.wifi_password) return;
        navigator.clipboard.writeText(restaurant.wifi_password);
        setCopiedPass(true);
        setTimeout(() => setCopiedPass(false), 2000);
    };

    return (
        <>
            <header className="sticky top-0 z-30 flex h-[var(--guest-header-h)] items-center justify-between gap-2 border-b border-border/80 bg-card/95 px-4 backdrop-blur-md">
                {/* Left: brand and table */}
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand font-display text-lg font-semibold text-brand-foreground ring-1 ring-black/5">
                        {restaurant.logo_url ? (
                            <img
                                src={restaurant.logo_url}
                                alt=""
                                width={40}
                                height={40}
                                className="size-full object-cover"
                            />
                        ) : (
                            restaurant.name.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="min-w-0">
                        <h1 className="truncate font-display text-[17px] leading-tight font-semibold tracking-tight text-foreground">
                            {restaurant.name}
                        </h1>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <span className="font-mono font-semibold text-foreground">{table.table_code}</span>
                            {currentGuestName && (
                                <>
                                    <span aria-hidden="true">·</span>
                                    <span className="truncate">Hi, {currentGuestName}</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {/* Right: Wi-Fi, diners, service. Every control is at least 44px. */}
                <div className="flex shrink-0 items-center gap-1.5">
                    {restaurant.wifi_ssid && (
                        <button
                            type="button"
                            onClick={() => setShowWifi(true)}
                            className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground active:scale-95"
                            aria-label="View restaurant Wi-Fi password"
                        >
                            <Wifi aria-hidden="true" className="size-[18px]" />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setShowGuests(true)}
                        className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl bg-muted px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70 active:scale-95"
                        aria-label="View seated table guests"
                    >
                        <Users aria-hidden="true" className="size-[18px] text-muted-foreground" />
                        <span className="font-mono tabular-nums">{guests.length || 1}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowService(true)}
                        className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl bg-brand px-3 text-sm font-bold text-brand-foreground shadow-xs transition-transform active:scale-95 min-[400px]:px-4"
                        aria-label="Call waiter or request service"
                    >
                        <Bell aria-hidden="true" className="size-[18px]" />
                        {/* Icon-only below 400px so the restaurant name keeps room on small phones */}
                        <span className="hidden min-[400px]:inline">Service</span>
                    </button>
                </div>
            </header>

            {/* Service Request Modal */}
            <ServiceRequestModal
                restaurantId={restaurant.id}
                table={table}
                sessionId={sessionId}
                isOpen={showService}
                onClose={() => setShowService(false)}
            />

            {/* Wi-Fi sheet */}
            <BottomSheet
                open={showWifi}
                onClose={() => setShowWifi(false)}
                label="Guest Wi-Fi"
                placement="adaptive"
                className="max-w-sm"
                contentClassName="px-6 pb-6 pt-1 sm:pt-6 space-y-4 text-center"
            >
                <button
                    type="button"
                    onClick={() => setShowWifi(false)}
                    className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Close Wi-Fi modal"
                >
                    <X aria-hidden="true" className="size-5" />
                </button>

                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand text-brand-foreground ring-1 ring-black/5">
                    <Wifi aria-hidden="true" className="size-6" />
                </div>

                <div>
                    <h2 className="font-display text-xl leading-tight font-semibold tracking-tight text-foreground">Guest Wi-Fi</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">Complimentary high-speed internet</p>
                </div>

                <dl className="space-y-1.5 rounded-2xl border border-border bg-muted/50 p-4 text-left text-sm">
                    <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Network</dt>
                        <dd translate="no" className="truncate font-semibold text-foreground">
                            {restaurant.wifi_ssid}
                        </dd>
                    </div>
                    {restaurant.wifi_password && (
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">Password</dt>
                            <dd translate="no" className="font-mono font-semibold break-all text-foreground">
                                {restaurant.wifi_password}
                            </dd>
                        </div>
                    )}
                </dl>

                {restaurant.wifi_password && (
                    <button
                        type="button"
                        onClick={handleCopyWifi}
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-brand-foreground shadow-sm transition-transform active:scale-[0.98]"
                    >
                        {copiedPass ? (
                            <>
                                <Check aria-hidden="true" className="size-4" />
                                <span aria-live="polite">Copied Password!</span>
                            </>
                        ) : (
                            <>
                                <Copy aria-hidden="true" className="size-4" />
                                <span>Copy Wi-Fi Password</span>
                            </>
                        )}
                    </button>
                )}
            </BottomSheet>

            {/* Table guests sheet */}
            <BottomSheet
                open={showGuests}
                onClose={() => setShowGuests(false)}
                label="Guests seated at your table"
                placement="adaptive"
                className="max-w-sm"
                contentClassName="px-6 pb-6 pt-1 sm:pt-6 space-y-4"
            >
                <button
                    type="button"
                    onClick={() => setShowGuests(false)}
                    className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Close table guests modal"
                >
                    <X aria-hidden="true" className="size-5" />
                </button>

                <div className="pr-10">
                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Table Live Session</p>
                    <h2 className="font-display text-xl leading-tight font-semibold tracking-tight text-foreground">
                        Seated at {table.display_name}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        All diners can add dishes to the shared table cart in real-time.
                    </p>
                </div>

                <ul className="space-y-2">
                    {guests.map((g) => {
                        const isMe = g.name.toLowerCase() === currentGuestName?.toLowerCase();
                        return (
                            <li
                                key={g.guest_id}
                                className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border bg-muted/60 px-3 py-2"
                            >
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <div
                                        aria-hidden="true"
                                        className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-bold text-brand-foreground"
                                    >
                                        {g.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="truncate text-sm font-semibold text-foreground">{g.name}</span>
                                </div>
                                {isMe && (
                                    <span className="shrink-0 rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-semibold text-zinc-800">
                                        You
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </BottomSheet>
        </>
    );
}
