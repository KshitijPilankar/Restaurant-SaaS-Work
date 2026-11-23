'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Sparkles, ArrowRight, Utensils } from 'lucide-react';
import {
    Restaurant,
    RestaurantTable,
    MenuCategory,
    MenuItem,
    TableSession,
    CartItem,
    Order,
    OrderItem,
    TableGuest,
} from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { GuestHeader } from '@/components/guest/GuestHeader';
import { TableJoinModal } from '@/components/guest/TableJoinModal';
import { MenuExplorer } from '@/components/guest/MenuExplorer';
import { DishDetailDrawer } from '@/components/guest/DishDetailDrawer';
import { SharedCartDrawer } from '@/components/guest/SharedCartDrawer';
import { LiveOrderTracker } from '@/components/guest/LiveOrderTracker';
import { BillCheckoutDrawer } from '@/components/guest/BillCheckoutDrawer';

interface OrderWithItems extends Order {
    order_items?: OrderItem[];
}

interface GuestAppShellProps {
    restaurant: Restaurant;
    table: RestaurantTable;
    categories: MenuCategory[];
    menuItems: MenuItem[];
    initialSession: TableSession | null;
    initialCart: CartItem[];
    initialOrders: OrderWithItems[];
}

export function GuestAppShell({
    restaurant,
    table,
    categories,
    menuItems,
    initialSession,
    initialCart,
    initialOrders,
}: GuestAppShellProps) {
    // Session & Diners State
    const [session, setSession] = useState<TableSession | null>(initialSession);
    const [currentGuestId, setCurrentGuestId] = useState<string | null>(null);
    const [currentGuestName, setCurrentGuestName] = useState<string | null>(null);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

    // Live Cart & Orders State
    const [cartItems, setCartItems] = useState<CartItem[]>(initialCart);
    const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);

    // Drawers / Modals
    const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isTrackerOpen, setIsTrackerOpen] = useState(false);
    const [isBillOpen, setIsBillOpen] = useState(false);

    const storageKey = `dineos_guest_${table.id}`;

    // Read stored guest identity on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.guestId && parsed.guestName) {
                    setCurrentGuestId(parsed.guestId);
                    setCurrentGuestName(parsed.guestName);
                    return;
                }
            }
        } catch {
            // Ignore parse errors
        }
        // If not found in localStorage, open TableJoinModal
        setIsJoinModalOpen(true);
    }, [storageKey]);

    // Handle joining table session
    const handleJoined = (guestId: string, guestName: string, sessionId: string) => {
        setCurrentGuestId(guestId);
        setCurrentGuestName(guestName);
        setIsJoinModalOpen(false);

        try {
            localStorage.setItem(storageKey, JSON.stringify({ guestId, guestName, sessionId }));
        } catch {
            // Ignore storage quota
        }

        // Optimistically update session guests
        setSession((prev) => {
            if (!prev) {
                return {
                    id: sessionId,
                    restaurant_id: restaurant.id,
                    table_id: table.id,
                    guests: [{ guest_id: guestId, name: guestName }],
                    is_active: true,
                    started_at: new Date().toISOString(),
                    closed_at: null,
                };
            }
            const exists = prev.guests.some((g) => g.guest_id === guestId);
            if (exists) return prev;
            return {
                ...prev,
                guests: [...prev.guests, { guest_id: guestId, name: guestName }],
            };
        });
    };

    // Supabase Realtime Subscription
    useEffect(() => {
        const supabase = createClient();
        const activeSessionId = session?.id || table.active_session_id;

        const channel = supabase
            .channel(`room:session:${activeSessionId || table.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'cart_items',
                    filter: `restaurant_id=eq.${restaurant.id}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newItem = payload.new as CartItem;
                        if (!activeSessionId || newItem.session_id === activeSessionId) {
                            setCartItems((prev) => {
                                if (prev.some((c) => c.id === newItem.id)) return prev;
                                return [...prev, newItem];
                            });
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as CartItem;
                        setCartItems((prev) =>
                            prev.map((c) => (c.id === updated.id ? updated : c))
                        );
                    } else if (payload.eventType === 'DELETE') {
                        const oldId = (payload.old as { id: string }).id;
                        setCartItems((prev) => prev.filter((c) => c.id !== oldId));
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `restaurant_id=eq.${restaurant.id}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newOrder = payload.new as Order;
                        if (!activeSessionId || newOrder.session_id === activeSessionId) {
                            setOrders((prev) => [newOrder as OrderWithItems, ...prev]);
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as Order;
                        setOrders((prev) =>
                            prev.map((ord) => (ord.id === updated.id ? { ...ord, ...updated } : ord))
                        );
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'table_sessions',
                    filter: `restaurant_id=eq.${restaurant.id}`,
                },
                (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as TableSession;
                        if (updated.id === activeSessionId) {
                            setSession(updated);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [restaurant.id, session?.id, table.active_session_id, table.id]);

    // Cart calculations
    const cartCount = useMemo(() => {
        return cartItems.reduce((acc, item) => acc + item.quantity, 0);
    }, [cartItems]);

    const cartSubtotal = useMemo(() => {
        return cartItems.reduce(
            (acc, item) => acc + Number(item.unit_price) * item.quantity,
            0
        );
    }, [cartItems]);

    // Active unserved orders
    const activeOrders = useMemo(() => {
        return orders.filter((o) => o.status !== 'SERVED' && o.status !== 'CANCELLED');
    }, [orders]);

    return (
        <div className="min-h-screen bg-background md:bg-zinc-100/70 dark:md:bg-zinc-950 flex justify-center items-start md:py-8 md:px-4">
            {/* Desktop Elevated Mobile Phone Container (max-w-[440px]) */}
            <div className="w-full max-w-[440px] min-h-screen md:min-h-[calc(100vh-4rem)] bg-background flex flex-col pb-32 relative md:rounded-[36px] md:border md:border-zinc-200/90 dark:md:border-zinc-800 md:shadow-2xl md:shadow-zinc-950/10 overflow-x-hidden border-x border-border/60 md:border-x-0 selection:bg-orange-500 selection:text-white">
                {/* Top Navigation */}
                <GuestHeader
                    restaurant={restaurant}
                    table={table}
                    sessionId={session?.id || null}
                    guests={session?.guests || []}
                    currentGuestName={currentGuestName}
                />

                {/* Menu Explorer */}
                <main className="flex-1 pt-2">
                    <MenuExplorer
                        categories={categories}
                        menuItems={menuItems}
                        cartItems={cartItems}
                        currentGuestId={currentGuestId}
                        currentGuestName={currentGuestName}
                        onSelectDish={(dish) => {
                            if (!currentGuestId || !currentGuestName) {
                                setIsJoinModalOpen(true);
                            } else {
                                setSelectedDish(dish);
                            }
                        }}
                    />
                </main>

                {/* Floating Bottom Sticky Bar */}
                {cartCount > 0 ? (
                    <aside aria-label="Shared Table Cart" className="fixed bottom-0 left-0 right-0 max-w-[440px] mx-auto p-4 pb-safe z-40 pointer-events-none">
                        <div
                            onClick={() => {
                                if (!currentGuestId) {
                                    setIsJoinModalOpen(true);
                                } else {
                                    setIsCartOpen(true);
                                }
                            }}
                            className="pointer-events-auto p-3.5 sm:p-4 rounded-2xl text-white shadow-xl shadow-orange-950/20 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all duration-200 animate-slideUp ring-1 ring-white/20"
                            style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/25 backdrop-blur-xs flex items-center justify-center font-extrabold text-sm shadow-inner">
                                    {cartCount}
                                </div>
                                <div>
                                    <div className="text-xs font-bold tracking-tight leading-tight flex items-center gap-1.5">
                                        <span>Shared Table Cart</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-ping" />
                                    </div>
                                    <div className="text-[11px] text-white/90 font-mono font-medium mt-0.5">₹{cartSubtotal} <span className="opacity-75 text-[10px]">+ taxes</span></div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 font-bold text-xs bg-white/20 hover:bg-white/30 backdrop-blur-xs px-3 py-1.5 rounded-xl transition shadow-xs">
                                <span>View Cart</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        </div>
                    </aside>
                ) : orders.length > 0 ? (
                    <aside aria-label="Live Order Status" className="fixed bottom-0 left-0 right-0 max-w-[440px] mx-auto p-4 pb-safe z-40 pointer-events-none">
                        <div
                            onClick={() => setIsTrackerOpen(true)}
                            className="pointer-events-auto p-3.5 rounded-2xl bg-zinc-900/95 backdrop-blur-md text-white shadow-xl shadow-zinc-950/30 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all duration-200 animate-slideUp border border-zinc-800"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-3 h-3 rounded-full animate-pulse shadow-sm"
                                    style={{ backgroundColor: 'var(--brand-primary)' }}
                                />
                                <div>
                                    <div className="text-xs font-bold tracking-tight">
                                        {activeOrders.length > 0 ? 'Cooking in Kitchen' : 'Orders Placed'}
                                    </div>
                                    <div className="text-[11px] text-zinc-400 font-medium">
                                        {orders.length} order{orders.length > 1 ? 's' : ''} • Tap to track live
                                    </div>
                                </div>
                            </div>

                            <div
                                className="flex items-center gap-1 font-bold text-xs bg-zinc-800 hover:bg-zinc-700/80 px-2.5 py-1.5 rounded-xl transition"
                                style={{ color: 'var(--brand-primary)' }}
                            >
                                <span>Track</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        </div>
                    </aside>
                ) : null}

                {/* Customization Drawer */}
                <DishDetailDrawer
                    dish={selectedDish}
                    restaurantId={restaurant.id}
                    sessionId={session?.id || ''}
                    guestId={currentGuestId || ''}
                    guestName={currentGuestName || ''}
                    isOpen={!!selectedDish}
                    onClose={() => setSelectedDish(null)}
                />

                {/* Shared Cart Drawer */}
                {session && currentGuestId && currentGuestName && (
                    <SharedCartDrawer
                        restaurant={restaurant}
                        table={table}
                        sessionId={session.id}
                        cartItems={cartItems}
                        menuItems={menuItems}
                        currentGuestId={currentGuestId}
                        currentGuestName={currentGuestName}
                        isOpen={isCartOpen}
                        onClose={() => setIsCartOpen(false)}
                        onOrderPlaced={() => setIsTrackerOpen(true)}
                    />
                )}

                {/* Live Order Tracker */}
                <LiveOrderTracker
                    restaurant={restaurant}
                    table={table}
                    orders={orders}
                    isOpen={isTrackerOpen}
                    onClose={() => setIsTrackerOpen(false)}
                    onOpenCheckout={() => setIsBillOpen(true)}
                />

                {/* Bill & Checkout Drawer */}
                {session && currentGuestName && (
                    <BillCheckoutDrawer
                        restaurant={restaurant}
                        table={table}
                        sessionId={session.id}
                        orders={orders}
                        currentGuestName={currentGuestName}
                        isOpen={isBillOpen}
                        onClose={() => setIsBillOpen(false)}
                    />
                )}

                {/* Table Join Modal */}
                <TableJoinModal
                    restaurant={restaurant}
                    table={table}
                    existingGuests={session?.guests || []}
                    isOpen={isJoinModalOpen}
                    onJoined={handleJoined}
                />
            </div>
        </div>
    );
}
