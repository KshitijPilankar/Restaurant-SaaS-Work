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
            <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border/80 px-4 py-2.5 flex items-center justify-between shadow-xs">
                {/* Left: Brand & Table */}
                <div className="flex items-center gap-2.5 min-w-0">
                    <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 text-sm overflow-hidden ring-1 ring-black/5"
                        style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                        {restaurant.logo_url ? (
                            <img
                                src={restaurant.logo_url}
                                alt={restaurant.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            restaurant.name.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h1 className="text-sm font-bold text-foreground truncate tracking-tight">
                                {restaurant.name}
                            </h1>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-500/20" />
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium mt-0.5">
                            <span className="bg-muted text-foreground font-semibold px-1.5 py-0.5 rounded-md font-mono border border-border/60">
                                {table.table_code}
                            </span>
                            {currentGuestName && (
                                <span className="truncate">Hi, {currentGuestName}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Actions (Wi-Fi, Diners, Service) */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Wi-Fi Pill (if configured) */}
                    {restaurant.wifi_ssid && (
                        <button
                            type="button"
                            onClick={() => setShowWifi(true)}
                            className="p-2 rounded-xl text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 transition cursor-pointer active:scale-95"
                            title="Restaurant Wi-Fi"
                            aria-label="View restaurant Wi-Fi password"
                        >
                            <Wifi className="w-4 h-4" />
                        </button>
                    )}

                    {/* Tablemates Button */}
                    <button
                        type="button"
                        onClick={() => setShowGuests(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition cursor-pointer active:scale-95"
                        title="Table Guests"
                        aria-label="View seated table guests"
                    >
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{guests.length || 1}</span>
                    </button>

                    {/* Call Waiter Button */}
                    <button
                        type="button"
                        onClick={() => setShowService(true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition shadow-xs cursor-pointer active:scale-95"
                        style={{ backgroundColor: 'var(--brand-primary)' }}
                        aria-label="Call waiter or request service"
                    >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Service</span>
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

            {/* Wi-Fi Popover Modal */}
            <BottomSheet
                open={showWifi}
                onClose={() => setShowWifi(false)}
                label="Guest Wi-Fi"
                placement="adaptive"
                className="max-w-sm"
                contentClassName="px-6 pb-6 pt-1 sm:pt-6 space-y-4 text-center"
            >
                        <button
                            onClick={() => setShowWifi(false)}
                            className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition cursor-pointer"
                            aria-label="Close Wi-Fi modal"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-foreground shadow-xs">
                            <Wifi className="w-6 h-6 text-foreground" />
                        </div>

                        <div>
                            <h3 className="font-bold text-foreground text-base tracking-tight">Guest Wi-Fi</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Complimentary high-speed internet</p>
                        </div>

                        <div className="p-3.5 bg-muted/50 border border-border rounded-2xl text-left space-y-1.5 text-xs">
                            <div className="text-muted-foreground">Network: <strong className="text-foreground">{restaurant.wifi_ssid}</strong></div>
                            {restaurant.wifi_password && (
                                <div className="text-muted-foreground">
                                    Password: <strong className="text-foreground font-mono">{restaurant.wifi_password}</strong>
                                </div>
                            )}
                        </div>

                        {restaurant.wifi_password && (
                            <button
                                type="button"
                                onClick={handleCopyWifi}
                                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
                                style={{ backgroundColor: 'var(--brand-primary)' }}
                            >
                                {copiedPass ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        <span>Copied Password!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        <span>Copy Wi-Fi Password</span>
                                    </>
                                )}
                            </button>
                        )}
            </BottomSheet>

            {/* Table Diners Modal */}
            <BottomSheet
                open={showGuests}
                onClose={() => setShowGuests(false)}
                label="Guests seated at your table"
                placement="adaptive"
                className="max-w-sm"
                contentClassName="px-6 pb-6 pt-1 sm:pt-6 space-y-4"
            >
                        <button
                            onClick={() => setShowGuests(false)}
                            className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition cursor-pointer"
                            aria-label="Close table guests modal"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div>
                            <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                                Table Live Session
                            </span>
                            <h3 className="font-bold text-foreground text-base tracking-tight">Seated at {table.display_name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                All diners can add dishes to the shared table cart in real-time.
                            </p>
                        </div>

                        <div className="space-y-2">
                            {guests.map((g) => {
                                const isMe = g.name.toLowerCase() === currentGuestName?.toLowerCase();
                                return (
                                    <div
                                        key={g.guest_id}
                                        className="flex items-center justify-between p-3 bg-muted/60 border border-border rounded-xl text-xs"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div
                                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-2xs"
                                                style={{ backgroundColor: 'var(--brand-primary)' }}
                                            >
                                                {g.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-semibold text-foreground text-sm">{g.name}</span>
                                        </div>
                                        {isMe && (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                                                You
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
            </BottomSheet>
        </>
    );
}
