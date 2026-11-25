'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ChefHat,
    Flame,
    Clock,
    CheckCircle2,
    Volume2,
    VolumeX,
    LogOut,
    UtensilsCrossed,
    Check,
    AlertTriangle,
} from 'lucide-react';
import {
    Restaurant,
    KitchenStation,
    Order,
    OrderItem,
    RestaurantTable,
    ItemPrepStatus,
    OrderStatus,
} from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import {
    updateOrderItemPrepStatus,
    bumpOrderReady,
    logoutStaff,
} from '@/app/staff/[slug]/actions';

interface OrderWithItems extends Order {
    order_items?: OrderItem[];
}

interface KdsBoardProps {
    restaurant: Restaurant;
    stations: KitchenStation[];
    initialOrders: OrderWithItems[];
    tables: RestaurantTable[];
    staffName: string;
}

export function KdsBoard({
    restaurant,
    stations,
    initialOrders,
    tables,
    staffName,
}: KdsBoardProps) {
    const router = useRouter();
    const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);
    const [activeStationId, setActiveStationId] = useState<string>('ALL');
    const [audioUnlocked, setAudioUnlocked] = useState(false);
    const [now, setNow] = useState<number>(Date.now());
    const [isActionPending, startActionTransition] = useTransition();

    // Tick every 15s to update elapsed timers
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 15000);
        return () => clearInterval(interval);
    }, []);

    // Audio chime for new kitchen orders
    const playOrderChime = () => {
        if (!audioUnlocked || typeof window === 'undefined') return;
        try {
            const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.6);
        } catch {
            // Ignored
        }
    };

    // Supabase Realtime Listener
    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel(`room:tenant:${restaurant.id}:kds`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newOrd = payload.new as OrderWithItems;
                        if (newOrd.status === 'IN_KITCHEN' || newOrd.status === 'READY') {
                            setOrders((prev) => [newOrd, ...prev]);
                            playOrderChime();
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as OrderWithItems;
                        if (updated.status === 'SERVED' || updated.status === 'CANCELLED') {
                            setOrders((prev) => prev.filter((o) => o.id !== updated.id));
                        } else {
                            setOrders((prev) =>
                                prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
                            );
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'order_items', filter: `restaurant_id=eq.${restaurant.id}` },
                (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        const updatedItem = payload.new as OrderItem;
                        setOrders((prev) =>
                            prev.map((ord) => {
                                if (ord.id !== updatedItem.order_id) return ord;
                                const items = (ord.order_items || []).map((oi) =>
                                    oi.id === updatedItem.id ? updatedItem : oi
                                );
                                return { ...ord, order_items: items };
                            })
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [restaurant.id, audioUnlocked]);

    // Filter orders for KDS: only active unserved kitchen orders
    const kitchenOrders = useMemo(() => {
        return orders.filter(
            (o) => o.status === 'IN_KITCHEN' || o.status === 'READY'
        );
    }, [orders]);

    // Station map
    const stationMap = useMemo(() => {
        return new Map(stations.map((s) => [s.id, s.name]));
    }, [stations]);

    // Actions
    const handleAdvanceItem = (itemId: string, currentStatus: ItemPrepStatus) => {
        let nextStatus: ItemPrepStatus = 'PREPARING';
        if (currentStatus === 'QUEUED') nextStatus = 'PREPARING';
        else if (currentStatus === 'PREPARING') nextStatus = 'READY';
        else if (currentStatus === 'READY') nextStatus = 'READY';

        startActionTransition(async () => {
            await updateOrderItemPrepStatus(restaurant.id, itemId, nextStatus, restaurant.slug);
        });
    };

    const handleBumpReady = (orderId: string) => {
        startActionTransition(async () => {
            await bumpOrderReady(restaurant.id, orderId, restaurant.slug);
        });
    };

    const handleLogout = () => {
        startActionTransition(async () => {
            await logoutStaff(restaurant.slug);
            router.refresh();
        });
    };

    // Timer state for a ticket. Thresholds follow the PRD: under 8 min on time, 8 to 15 slow, 15+ overdue.
    // State is carried by color, an icon and a word, never by color alone.
    const getTimerConf = (startTime: string) => {
        const start = new Date(startTime).getTime();
        const mins = Math.max(0, Math.floor((now - start) / 60000));

        if (mins < 8) {
            return {
                mins,
                label: 'On time',
                Icon: Clock,
                border: 'border-emerald-500/70',
                text: 'text-emerald-300',
                overdue: false,
            };
        } else if (mins < 15) {
            return {
                mins,
                label: 'Getting late',
                Icon: Clock,
                border: 'border-amber-400',
                text: 'text-amber-300',
                overdue: false,
            };
        } else {
            return {
                mins,
                label: 'Overdue',
                Icon: AlertTriangle,
                border: 'border-red-500',
                text: 'text-red-300',
                overdue: true,
            };
        }
    };

    const ITEM_STATUS: Record<
        ItemPrepStatus,
        { label: string; next: string; chip: string; Icon: React.ElementType }
    > = {
        QUEUED: { label: 'Queued', next: 'start cooking', chip: 'border-zinc-600 bg-zinc-800 text-zinc-200', Icon: Clock },
        PREPARING: { label: 'Cooking', next: 'mark ready', chip: 'border-amber-400/60 bg-amber-500/15 text-amber-200', Icon: Flame },
        READY: { label: 'Ready', next: '', chip: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200', Icon: Check },
        SERVED: { label: 'Served', next: '', chip: 'border-zinc-600 bg-zinc-800 text-zinc-300', Icon: Check },
    };

    return (
        <div className="dark flex min-h-screen flex-col bg-background font-sans text-foreground selection:bg-primary selection:text-primary-foreground">
            {/* Top operational header */}
            <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md lg:px-8">
                <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <ChefHat aria-hidden="true" className="size-7" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <h1 className="text-xl font-bold tracking-tight text-foreground">{restaurant.name}</h1>
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-sm font-semibold text-emerald-300">
                                KDS · {kitchenOrders.length} Active Tickets
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Chef in charge: <strong className="font-semibold text-foreground">{staffName}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setAudioUnlocked(true);
                            playOrderChime();
                        }}
                        className={`inline-flex min-h-14 items-center gap-2 rounded-xl border px-4 text-base font-semibold transition-colors ${
                            audioUnlocked
                                ? 'border-emerald-600/60 bg-emerald-950/60 text-emerald-300'
                                : 'border-amber-500/60 bg-amber-950/60 text-amber-200'
                        }`}
                    >
                        {audioUnlocked ? (
                            <Volume2 aria-hidden="true" className="size-5" />
                        ) : (
                            <VolumeX aria-hidden="true" className="size-5" />
                        )}
                        <span className="hidden sm:inline">{audioUnlocked ? 'Sound On' : 'Sound Off'}</span>
                    </button>

                    <a
                        href={`/staff/${restaurant.slug}/floor`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-14 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-base font-medium text-zinc-100 transition-colors hover:bg-zinc-700"
                    >
                        <UtensilsCrossed aria-hidden="true" className="size-5 text-blue-300" />
                        <span className="hidden sm:inline">Floor Map</span>
                        <span className="sr-only sm:hidden">Floor Map</span>
                    </a>

                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isActionPending}
                        className="inline-flex min-h-14 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-base font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50"
                    >
                        <LogOut aria-hidden="true" className="size-5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </header>

            {/* Sound must be enabled once per session, or browsers block the order chime */}
            {!audioUnlocked && (
                <button
                    type="button"
                    onClick={() => {
                        setAudioUnlocked(true);
                        playOrderChime();
                    }}
                    className="flex min-h-14 w-full items-center justify-center gap-2 border-b border-amber-500/40 bg-amber-950/50 px-4 text-base font-semibold text-amber-200 transition-colors hover:bg-amber-950/70"
                >
                    <VolumeX aria-hidden="true" className="size-5" />
                    <span>Order chime is muted. Tap here to turn it on.</span>
                </button>
            )}

            {/* Station filter */}
            <nav
                aria-label="Kitchen stations"
                className="scrollbar-none flex items-center gap-2 overflow-x-auto border-b border-border bg-card/60 px-4 py-2.5 lg:px-8"
            >
                {[{ id: 'ALL', name: 'All Stations', count: kitchenOrders.length }, ...stations.map((st) => ({
                    id: st.id,
                    name: st.name,
                    count: kitchenOrders.filter((o) =>
                        (o.order_items || []).some((item) => item.station_id === st.id)
                    ).length,
                }))].map((st) => {
                    const isActive = activeStationId === st.id;
                    return (
                        <button
                            key={st.id}
                            type="button"
                            onClick={() => setActiveStationId(st.id)}
                            aria-pressed={isActive}
                            className={`inline-flex min-h-14 shrink-0 items-center gap-2 rounded-xl px-5 text-base font-semibold whitespace-nowrap transition-colors ${
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'border border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                            }`}
                        >
                            <span>{st.name}</span>
                            <span className="font-mono text-sm tabular-nums">({st.count})</span>
                        </button>
                    );
                })}
            </nav>

            {/* Ticket board */}
            <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-6 lg:px-8">
                {kitchenOrders.length === 0 ? (
                    <div className="flex h-96 flex-col items-center justify-center space-y-3 text-center">
                        <div className="flex size-20 items-center justify-center rounded-2xl border border-border bg-card text-zinc-500">
                            <ChefHat aria-hidden="true" className="size-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-200">No Active Kitchen Tickets</h2>
                        <p className="max-w-sm text-base text-muted-foreground">
                            Approved guest orders from the Floor Staff will appear here in real-time.
                        </p>
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {kitchenOrders.map((order) => {
                            const orderTable = tables.find((t) => t.id === order.table_id);
                            const timer = getTimerConf(order.approved_at || order.created_at);

                            // Items for the selected station only
                            const relevantItems = (order.order_items || []).filter((item) => {
                                if (activeStationId === 'ALL') return true;
                                return item.station_id === activeStationId;
                            });

                            if (relevantItems.length === 0) return null;

                            const isAllReady = relevantItems.every((i) => i.prep_status === 'READY');
                            const TimerIcon = timer.Icon;

                            return (
                                <li
                                    key={order.id}
                                    className={`relative flex flex-col gap-4 rounded-2xl border-4 bg-card p-4 shadow-xl ${timer.border}`}
                                >
                                    {/* Overdue: only this border overlay beats, never the ticket text */}
                                    {timer.overdue && (
                                        <span
                                            aria-hidden="true"
                                            className="animate-borderBeat pointer-events-none absolute -inset-1 rounded-2xl border-4 border-red-400"
                                        />
                                    )}

                                    {/* Ticket header: the elapsed timer is the biggest thing on the ticket */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 space-y-1">
                                            <p className="inline-block rounded-xl border border-zinc-600 bg-zinc-800 px-3 py-1 font-mono text-2xl font-black text-white">
                                                {orderTable?.table_code || 'T?'}
                                            </p>
                                            <p className="truncate text-base font-semibold text-zinc-200">
                                                {orderTable?.display_name || 'Table'}
                                            </p>
                                        </div>

                                        <div className={`text-right ${timer.text}`}>
                                            <p className="flex items-baseline justify-end gap-1.5">
                                                <span className="font-mono text-6xl leading-none font-black tabular-nums">{timer.mins}</span>
                                                <span className="text-lg font-bold">min</span>
                                            </p>
                                            <p className="mt-1 inline-flex items-center justify-end gap-1.5 text-base font-semibold">
                                                <TimerIcon aria-hidden="true" className="size-4" />
                                                <span>{timer.label}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <p className="flex flex-wrap items-center justify-between gap-x-3 text-base text-zinc-300">
                                        <span className="font-mono tabular-nums">KOT #{order.order_number || 1}</span>
                                        <span>
                                            Guest: <strong className="font-semibold text-white">{order.placed_by_name}</strong>
                                        </span>
                                    </p>

                                    {/* Items: each whole row is one big tap target that advances its status */}
                                    <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-background">
                                        {relevantItems.map((item) => {
                                            const status = ITEM_STATUS[item.prep_status];
                                            const StatusIcon = status.Icon;
                                            const isReady = item.prep_status === 'READY';
                                            const stationName = item.station_id ? stationMap.get(item.station_id) : null;

                                            return (
                                                <li key={item.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAdvanceItem(item.id, item.prep_status)}
                                                        aria-label={`${item.quantity} ${item.item_name}, ${status.label}.${status.next ? ` Tap to ${status.next}.` : ""}`}
                                                        className="flex min-h-16 w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-900 active:bg-zinc-800"
                                                    >
                                                        <span className="min-w-0 flex-1">
                                                            <span className="flex items-baseline gap-2">
                                                                <span className="font-mono text-xl font-black text-white tabular-nums">
                                                                    {item.quantity}×
                                                                </span>
                                                                <span
                                                                    className={`text-lg leading-snug font-semibold ${
                                                                        isReady ? 'text-zinc-500 line-through' : 'text-zinc-100'
                                                                    }`}
                                                                >
                                                                    {item.item_name}
                                                                </span>
                                                            </span>
                                                            {item.variant_name && (
                                                                <span className="block pl-9 text-base text-zinc-400">
                                                                    Portion: {item.variant_name}
                                                                </span>
                                                            )}
                                                            {activeStationId === 'ALL' && stationName && (
                                                                <span className="block pl-9 text-sm text-zinc-400">{stationName}</span>
                                                            )}
                                                            {item.notes && (
                                                                <span className="mt-1 ml-9 block rounded-lg border border-amber-400/30 bg-amber-500/15 px-2 py-1 text-base font-medium text-amber-200">
                                                                    ★ {item.notes}
                                                                </span>
                                                            )}
                                                        </span>

                                                        <span
                                                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold tracking-wide uppercase ${status.chip}`}
                                                        >
                                                            <StatusIcon aria-hidden="true" className="size-4" />
                                                            {status.label}
                                                        </span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>

                                    {/* Bump the whole ticket */}
                                    <button
                                        type="button"
                                        onClick={() => handleBumpReady(order.id)}
                                        disabled={isActionPending || isAllReady}
                                        className={`flex min-h-16 w-full items-center justify-center gap-2 rounded-xl px-4 text-lg font-bold transition-colors active:scale-[0.98] disabled:cursor-default ${
                                            isAllReady
                                                ? 'border border-emerald-700 bg-emerald-950/60 text-emerald-300'
                                                : 'bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-60'
                                        }`}
                                    >
                                        <CheckCircle2 aria-hidden="true" className="size-6" />
                                        <span>{isAllReady ? 'Order Ready for Pickup' : 'Bump Entire Order Ready'}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </main>
        </div>
    );
}
