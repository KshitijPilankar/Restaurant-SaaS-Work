'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
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
    const [isDishOpen, setIsDishOpen] = useState(false);
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

        // A Realtime order INSERT carries only the order row; its items are written a moment later.
        // Merge items into the matching order (no duplicates) so the tracker and the bill's
        // "By Person" split show them right away.
        let disposed = false;
        const retryTimers: number[] = [];

        const mergeOrderItems = (orderId: string, items: OrderItem[]) => {
            if (items.length === 0) return;
            setOrders((prev) =>
                prev.map((ord) => {
                    if (ord.id !== orderId) return ord;
                    const known = new Set((ord.order_items || []).map((oi) => oi.id));
                    const fresh = items.filter((oi) => !known.has(oi.id));
                    return fresh.length > 0
                        ? { ...ord, order_items: [...(ord.order_items || []), ...fresh] }
                        : ord;
                })
            );
        };

        // Fetch the order's items; if they are not written yet, retry a few times.
        const hydrateOrderItems = async (orderId: string, attempt = 0) => {
            const { data } = await supabase
                .from('order_items')
                .select('*')
                .eq('restaurant_id', restaurant.id)
                .eq('order_id', orderId);
            if (disposed) return;
            if (data && data.length > 0) {
                mergeOrderItems(orderId, data as OrderItem[]);
            } else if (attempt < 3) {
                retryTimers.push(
                    window.setTimeout(() => void hydrateOrderItems(orderId, attempt + 1), 500 * (attempt + 1))
                );
            }
        };

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
                            void hydrateOrderItems(newOrder.id);
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
                    event: 'INSERT',
                    schema: 'public',
                    table: 'order_items',
                    filter: `restaurant_id=eq.${restaurant.id}`,
                },
                (payload) => {
                    const newItem = payload.new as OrderItem;
                    mergeOrderItems(newItem.order_id, [newItem]);
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
            disposed = true;
            retryTimers.forEach((t) => window.clearTimeout(t));
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
            <div className="w-full max-w-[440px] min-h-screen md:min-h-[calc(100vh-4rem)] bg-background flex flex-col pb-32 relative md:rounded-[36px] md:border md:border-zinc-200/90 dark:md:border-zinc-800 md:shadow-2xl md:shadow-zinc-950/10 overflow-x-hidden border-x border-border/60 md:border-x-0">
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
                                setIsDishOpen(true);
                            }
                        }}
                    />
                </main>

                {/* Floating Bottom Sticky Bar */}
                {cartCount > 0 ? (
                    <aside aria-label="Shared Table Cart" className="pointer-events-none fixed right-0 bottom-0 left-0 z-40 mx-auto max-w-[440px] p-4 pb-safe">
                        <button
                            type="button"
                            onClick={() => {
                                if (!currentGuestId) {
                                    setIsJoinModalOpen(true);
                                } else {
                                    setIsCartOpen(true);
                                }
                            }}
                            className="pointer-events-auto animate-slideUp flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-brand px-4 py-2.5 text-left text-brand-foreground shadow-xl shadow-black/15 ring-1 ring-black/10 transition-transform active:scale-[0.98]"
                        >
                            <span className="flex min-w-0 items-center gap-3">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-current/15 font-mono text-sm font-extrabold tabular-nums">
                                    {cartCount}
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm leading-tight font-bold">Shared Table Cart</span>
                                    <span className="block font-mono text-xs font-medium tabular-nums opacity-80">
                                        ₹{cartSubtotal} + taxes
                                    </span>
                                </span>
                            </span>

                            <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold">
                                <span>View Cart</span>
                                <ArrowRight aria-hidden="true" className="size-4" />
                            </span>
                        </button>
                    </aside>
                ) : orders.length > 0 ? (
                    <aside aria-label="Live Order Status" className="pointer-events-none fixed right-0 bottom-0 left-0 z-40 mx-auto max-w-[440px] p-4 pb-safe">
                        <button
                            type="button"
                            onClick={() => setIsTrackerOpen(true)}
                            className="pointer-events-auto animate-slideUp flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/95 px-4 py-2.5 text-left text-white shadow-xl shadow-black/25 backdrop-blur-md transition-transform active:scale-[0.98]"
                        >
                            <span className="flex min-w-0 items-center gap-3">
                                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-brand ring-4 ring-white/10" />
                                <span className="min-w-0">
                                    <span className="block text-sm leading-tight font-bold">
                                        {activeOrders.length > 0 ? 'Cooking in Kitchen' : 'Orders Placed'}
                                    </span>
                                    <span className="block text-xs font-medium text-zinc-300">
                                        {orders.length} {orders.length === 1 ? 'order' : 'orders'} · Tap to track live
                                    </span>
                                </span>
                            </span>

                            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2 text-sm font-bold text-white">
                                <span>Track</span>
                                <ArrowRight aria-hidden="true" className="size-4" />
                            </span>
                        </button>
                    </aside>
                ) : null}

                {/* Customization Drawer */}
                <DishDetailDrawer
                    dish={selectedDish}
                    restaurantId={restaurant.id}
                    sessionId={session?.id || ''}
                    guestId={currentGuestId || ''}
                    guestName={currentGuestName || ''}
                    isOpen={isDishOpen}
                    onClose={() => setIsDishOpen(false)}
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
