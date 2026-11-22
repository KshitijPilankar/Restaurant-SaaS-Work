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
    Layers,
    ArrowRight,
    X,
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

    // Timer color calculation
    const getTimerConf = (startTime: string) => {
        const start = new Date(startTime).getTime();
        const mins = Math.max(0, Math.floor((now - start) / 60000));

        if (mins < 8) {
            return {
                mins,
                border: 'border-emerald-500/80',
                badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-800',
                text: 'text-emerald-400',
                pulse: false,
            };
        } else if (mins < 15) {
            return {
                mins,
                border: 'border-amber-500',
                badge: 'bg-amber-950/60 text-amber-400 border-amber-800',
                text: 'text-amber-400',
                pulse: false,
            };
        } else {
            return {
                mins,
                border: 'border-red-500 shadow-lg shadow-red-950/40',
                badge: 'bg-red-950/80 text-red-400 border-red-700',
                text: 'text-red-400 font-extrabold',
                pulse: true,
            };
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
            {/* Top Operational Header */}
            <header className="sticky top-0 z-30 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md px-4 lg:px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-600/30">
                        <ChefHat className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold text-white tracking-tight">{restaurant.name}</h1>
                            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                KDS • {kitchenOrders.length} Active Tickets
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400">
                            Chef in charge: <strong className="text-zinc-200">{staffName}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Audio Unlock */}
                    <button
                        type="button"
                        onClick={() => {
                            setAudioUnlocked(true);
                            playOrderChime();
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            audioUnlocked
                                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                                : 'bg-amber-950/60 border-amber-800 text-amber-400 animate-pulse'
                        }`}
                        title={audioUnlocked ? 'Audio Active' : 'Tap to Enable Audio'}
                    >
                        {audioUnlocked ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        <span className="hidden sm:inline">
                            {audioUnlocked ? 'Chime Active' : 'Enable Chime'}
                        </span>
                    </button>

                    {/* Switch to Floor */}
                    <a
                        href={`/staff/${restaurant.slug}/floor`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white border border-zinc-700 transition"
                    >
                        <UtensilsCrossed className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden sm:inline">Floor Map</span>
                    </a>

                    <button
                        onClick={handleLogout}
                        disabled={isActionPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </header>

            {/* Station Filter Ribbon */}
            <div className="bg-zinc-900/60 border-b border-zinc-800/80 px-4 lg:px-8 py-2.5 overflow-x-auto scrollbar-none flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setActiveStationId('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        activeStationId === 'ALL'
                            ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                            : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
                    }`}
                >
                    All Stations ({kitchenOrders.length})
                </button>

                {stations.map((st) => {
                    const count = kitchenOrders.filter((o) =>
                        (o.order_items || []).some((item) => item.station_id === st.id)
                    ).length;

                    const isActive = activeStationId === st.id;

                    return (
                        <button
                            key={st.id}
                            type="button"
                            onClick={() => setActiveStationId(st.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                isActive
                                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
                            }`}
                        >
                            <span>{st.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40">
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Main KOT Ticket Board */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
                {kitchenOrders.length === 0 ? (
                    <div className="h-96 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                            <ChefHat className="w-8 h-8" />
                        </div>
                        <h2 className="text-lg font-bold text-zinc-300">No Active Kitchen Tickets</h2>
                        <p className="text-xs text-zinc-500 max-w-xs">
                            Approved guest orders from the Floor Staff will appear here in real-time.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {kitchenOrders.map((order) => {
                            const orderTable = tables.find((t) => t.id === order.table_id);
                            const timer = getTimerConf(order.approved_at || order.created_at);

                            // Filter items if specific station selected
                            const relevantItems = (order.order_items || []).filter((item) => {
                                if (activeStationId === 'ALL') return true;
                                return item.station_id === activeStationId;
                            });

                            if (relevantItems.length === 0) return null;

                            const isAllReady = relevantItems.every((i) => i.prep_status === 'READY');

                            return (
                                <div
                                    key={order.id}
                                    className={`bg-zinc-900 rounded-3xl border-2 transition-all p-4 flex flex-col justify-between shadow-xl space-y-3 relative overflow-hidden ${
                                        timer.border
                                    } ${timer.pulse ? 'animate-pulse' : ''}`}
                                >
                                    {/* Ticket Header */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-mono font-black text-white bg-zinc-800 px-2.5 py-0.5 rounded-xl border border-zinc-700">
                                                    {orderTable?.table_code || 'T?'}
                                                </span>
                                                <span className="text-xs font-bold text-zinc-300">
                                                    {orderTable?.display_name || 'Table'}
                                                </span>
                                            </div>

                                            {/* Timer Badge */}
                                            <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${timer.badge}`}
                                            >
                                                <Clock className="w-3 h-3" />
                                                <span>{timer.mins}m</span>
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                                            <span>KOT #{order.order_number || 1}</span>
                                            <span>Guest: <strong>{order.placed_by_name}</strong></span>
                                        </div>
                                    </div>

                                    {/* Items List */}
                                    <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800/80 divide-y divide-zinc-800/60 space-y-2">
                                        {relevantItems.map((item) => {
                                            const isReady = item.prep_status === 'READY';
                                            const isPrep = item.prep_status === 'PREPARING';

                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleAdvanceItem(item.id, item.prep_status)}
                                                    className="pt-2 first:pt-0 flex items-start justify-between gap-2 cursor-pointer hover:bg-zinc-900/50 p-1 rounded-xl transition"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono font-black text-white text-sm">
                                                                {item.quantity}x
                                                            </span>
                                                            <span
                                                                className={`text-xs font-bold truncate ${
                                                                    isReady
                                                                        ? 'line-through text-zinc-500'
                                                                        : 'text-zinc-200'
                                                                }`}
                                                            >
                                                                {item.item_name}
                                                            </span>
                                                        </div>
                                                        {item.variant_name && (
                                                            <div className="text-[10px] text-zinc-400 ml-5">
                                                                Portion: {item.variant_name}
                                                            </div>
                                                        )}
                                                        {item.notes && (
                                                            <div className="text-[10px] text-amber-300 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded mt-0.5 ml-5 border border-amber-500/20">
                                                                ★ {item.notes}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Status Tap Indicator (Min 44px target) */}
                                                    <button
                                                        type="button"
                                                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 transition flex items-center gap-1 ${
                                                            isReady
                                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                                : isPrep
                                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                                : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                                        }`}
                                                    >
                                                        {isReady ? (
                                                            <>
                                                                <Check className="w-3 h-3 text-emerald-400" />
                                                                <span>Ready</span>
                                                            </>
                                                        ) : isPrep ? (
                                                            <>
                                                                <Flame className="w-3 h-3 text-amber-400" />
                                                                <span>Cooking</span>
                                                            </>
                                                        ) : (
                                                            <span>Queued</span>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Bump Ticket Ready CTA */}
                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            onClick={() => handleBumpReady(order.id)}
                                            disabled={isActionPending || isAllReady}
                                            className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                                                isAllReady
                                                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-400 cursor-default'
                                                    : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white'
                                            }`}
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>{isAllReady ? 'Order Ready for Pickup' : 'Bump Entire Order Ready'}</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
