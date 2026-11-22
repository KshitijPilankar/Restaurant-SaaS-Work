'use client';

import React, { useState } from 'react';
import { Wifi, Bell, Users, Copy, Check, X } from 'lucide-react';
import { Restaurant, RestaurantTable, TableGuest } from '@/types/database';
import { ServiceRequestModal } from '@/components/guest/ServiceRequestModal';

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
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 px-4 py-2.5 flex items-center justify-between shadow-2xs">
                {/* Left: Brand & Table */}
                <div className="flex items-center gap-2.5 min-w-0">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 text-sm overflow-hidden"
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
                            <h1 className="text-sm font-bold text-zinc-900 truncate tracking-tight">
                                {restaurant.name}
                            </h1>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                            <span className="bg-zinc-100 text-zinc-700 font-semibold px-1.5 py-0.2 rounded font-mono">
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
                            className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/80 transition cursor-pointer"
                            title="Restaurant Wi-Fi"
                        >
                            <Wifi className="w-4 h-4" />
                        </button>
                    )}

                    {/* Tablemates Button */}
                    <button
                        type="button"
                        onClick={() => setShowGuests(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 transition cursor-pointer"
                    >
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{guests.length || 1}</span>
                    </button>

                    {/* Call Waiter Button */}
                    <button
                        type="button"
                        onClick={() => setShowService(true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer active:scale-95"
                        style={{ backgroundColor: 'var(--brand-primary)' }}
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
            {showWifi && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-4 animate-slideUp relative text-center">
                        <button
                            onClick={() => setShowWifi(false)}
                            className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-zinc-600"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-800">
                            <Wifi className="w-6 h-6" />
                        </div>

                        <div>
                            <h3 className="font-bold text-zinc-900 text-base">Guest Wi-Fi</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Complimentary high-speed internet</p>
                        </div>

                        <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-2xl text-left space-y-1 text-xs">
                            <div className="text-zinc-500">Network: <strong className="text-zinc-900">{restaurant.wifi_ssid}</strong></div>
                            {restaurant.wifi_password && (
                                <div className="text-zinc-500">
                                    Password: <strong className="text-zinc-900 font-mono">{restaurant.wifi_password}</strong>
                                </div>
                            )}
                        </div>

                        {restaurant.wifi_password && (
                            <button
                                type="button"
                                onClick={handleCopyWifi}
                                className="w-full py-2.5 px-3 rounded-xl font-semibold text-xs text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
                                style={{ backgroundColor: 'var(--brand-primary)' }}
                            >
                                {copiedPass ? (
                                    <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Copied Password!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy Wi-Fi Password</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Table Diners Modal */}
            {showGuests && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
                    <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 animate-slideUp relative">
                        <button
                            onClick={() => setShowGuests(false)}
                            className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-zinc-600"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div>
                            <span className="text-[11px] font-semibold uppercase text-zinc-400 tracking-wider">
                                Table Live Session
                            </span>
                            <h3 className="font-bold text-zinc-900 text-base">Seated at {table.display_name}</h3>
                            <p className="text-xs text-zinc-500">
                                All diners can add dishes to the shared table cart in real-time.
                            </p>
                        </div>

                        <div className="space-y-2">
                            {guests.map((g) => {
                                const isMe = g.name.toLowerCase() === currentGuestName?.toLowerCase();
                                return (
                                    <div
                                        key={g.guest_id}
                                        className="flex items-center justify-between p-2.5 bg-zinc-50 border border-zinc-200/80 rounded-xl text-xs"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[11px]"
                                                style={{ backgroundColor: 'var(--brand-primary)' }}
                                            >
                                                {g.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-semibold text-zinc-800">{g.name}</span>
                                        </div>
                                        {isMe && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-zinc-700">
                                                You
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
