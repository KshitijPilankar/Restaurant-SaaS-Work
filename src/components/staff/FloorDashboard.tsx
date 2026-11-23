'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    UtensilsCrossed,
    Bell,
    ChefHat,
    Users,
    CheckCircle2,
    XCircle,
    RotateCcw,
    LogOut,
    Sparkles,
    Volume2,
    VolumeX,
    ExternalLink,
    AlertCircle,
    Check,
    Clock,
    X,
    Receipt,
    Flame,
} from 'lucide-react';
import {
    Restaurant,
    RestaurantTable,
    Order,
    OrderItem,
    ServiceRequest,
    TableSession,
    TableStatus,
    StaffRole,
} from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import {
    approveOrder,
    rejectOrder,
    markOrderServed,
    resolveServiceRequest,
    resetTableSession,
    logoutStaff,
} from '@/app/staff/[slug]/actions';

interface OrderWithItems extends Order {
    order_items?: OrderItem[];
}

interface FloorDashboardProps {
    restaurant: Restaurant;
    initialTables: RestaurantTable[];
    initialOrders: OrderWithItems[];
    initialRequests: ServiceRequest[];
    initialSessions: TableSession[];
    staffName: string;
    staffRole: StaffRole;
}

const TABLE_STATUS_COLORS: Record<
    TableStatus,
    { label: string; border: string; bg: string; text: string; dot: string; pulse: boolean }
> = {
    FREE: { label: 'Free', border: 'border-zinc-800', bg: 'bg-zinc-900/40', text: 'text-zinc-400', dot: 'bg-zinc-500', pulse: false },
    ORDERING: { label: 'Ordering', border: 'border-blue-600/80', bg: 'bg-blue-950/20', text: 'text-blue-400', dot: 'bg-blue-400', pulse: false },
    PENDING_APPROVAL: { label: 'New Order', border: 'border-amber-500', bg: 'bg-amber-950/30', text: 'text-amber-400', dot: 'bg-amber-400', pulse: true },
    EATING: { label: 'Eating', border: 'border-emerald-600/80', bg: 'bg-emerald-950/20', text: 'text-emerald-400', dot: 'bg-emerald-400', pulse: false },
    HELP: { label: 'Service Call', border: 'border-red-500', bg: 'bg-red-950/40', text: 'text-red-400', dot: 'bg-red-500', pulse: true },
    BILL: { label: 'BILL PAID', border: 'border-purple-500 shadow-lg shadow-purple-950/50', bg: 'bg-purple-950/40', text: 'text-purple-300', dot: 'bg-purple-400', pulse: true },
};

export function FloorDashboard({
    restaurant,
    initialTables,
    initialOrders,
    initialRequests,
    initialSessions,
    staffName,
    staffRole,
}: FloorDashboardProps) {
    const router = useRouter();
    const [tables, setTables] = useState<RestaurantTable[]>(initialTables);
    const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);
    const [requests, setRequests] = useState<ServiceRequest[]>(initialRequests);
    const [sessions, setSessions] = useState<TableSession[]>(initialSessions);

    // Selected Table for Drawer Inspection
    const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

    // Audio Chime State
    const [audioUnlocked, setAudioUnlocked] = useState(false);
    const [isActionPending, startActionTransition] = useTransition();

    // Synthesised Web Audio API Chime (Zero external mp3 needed)
    const playChime = (type: 'order' | 'alert') => {
        if (!audioUnlocked || typeof window === 'undefined') return;
        try {
            const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            if (type === 'order') {
                osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.5);
            } else {
                osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
                osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2); // A4
                gain.gain.setValueAtTime(0.4, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.6);
            }
        } catch {
            // Audio policy blocked
        }
    };

    // Supabase Realtime Listener
    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel(`room:tenant:${restaurant.id}:floor`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${restaurant.id}` },
                (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as RestaurantTable;
                        setTables((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                        setSelectedTable((prev) => (prev?.id === updated.id ? updated : prev));
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newOrd = payload.new as OrderWithItems;
                        setOrders((prev) => [newOrd, ...prev]);
                        if (newOrd.status === 'PENDING_APPROVAL') {
                            playChime('order');
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as OrderWithItems;
                        setOrders((prev) =>
                            prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
                        );
                        if (updated.status === 'READY') {
                            playChime('order');
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'service_requests', filter: `restaurant_id=eq.${restaurant.id}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newReq = payload.new as ServiceRequest;
                        setRequests((prev) => [newReq, ...prev]);
                        playChime('alert');
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as ServiceRequest;
                        setRequests((prev) =>
                            prev.map((r) => (r.id === updated.id ? updated : r)).filter((r) => r.status === 'OPEN')
                        );
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'table_sessions', filter: `restaurant_id=eq.${restaurant.id}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setSessions((prev) => [payload.new as TableSession, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as TableSession;
                        setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [restaurant.id, audioUnlocked]);

    // Pending Orders needing Waiter Approval
    const pendingOrders = useMemo(() => {
        return orders.filter((o) => o.status === 'PENDING_APPROVAL');
    }, [orders]);

    // Open Service Requests
    const openRequests = useMemo(() => {
        return requests.filter((r) => r.status === 'OPEN');
    }, [requests]);

    // Natural numerical sorting for tables in Live Floor Map (T1, T2, ..., T9, T10)
    const sortedTables = useMemo(() => {
        return [...tables].sort((a, b) => {
            const codeA = a.table_code || '';
            const codeB = b.table_code || '';
            const cmp = codeA.localeCompare(codeB, undefined, {
                numeric: true,
                sensitivity: 'base',
            });
            if (cmp !== 0) return cmp;
            return (a.display_name || '').localeCompare(b.display_name || '', undefined, {
                numeric: true,
                sensitivity: 'base',
            });
        });
    }, [tables]);

    // Actions
    const handleApprove = (orderId: string) => {
        startActionTransition(async () => {
            await approveOrder(restaurant.id, orderId, restaurant.slug);
        });
    };

    const handleReject = (orderId: string) => {
        if (!confirm('Reject this guest order?')) return;
        startActionTransition(async () => {
            await rejectOrder(restaurant.id, orderId, restaurant.slug);
        });
    };

    const handleServeOrder = (orderId: string) => {
        startActionTransition(async () => {
            await markOrderServed(restaurant.id, orderId, restaurant.slug);
        });
    };

    const handleResolveRequest = (requestId: string) => {
        startActionTransition(async () => {
            await resolveServiceRequest(restaurant.id, requestId, restaurant.slug);
        });
    };

    const handleResetTable = (tableId: string, sessionId?: string | null) => {
        if (!confirm('Reset this table? Current diners and active orders will be archived.')) return;
        startActionTransition(async () => {
            await resetTableSession(restaurant.id, tableId, sessionId, restaurant.slug);
            setSelectedTable(null);
        });
    };

    const handleLogout = () => {
        startActionTransition(async () => {
            await logoutStaff(restaurant.slug);
            router.refresh();
        });
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans selection:bg-orange-500 selection:text-white">
            {/* Top Navigation */}
            <header className="sticky top-0 z-30 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md px-4 lg:px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-600/30 font-bold">
                        <UtensilsCrossed className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold text-white tracking-tight">{restaurant.name}</h1>
                            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Floor Service
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400">
                            Logged in as <strong className="text-zinc-200">{staffName}</strong> ({staffRole})
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Audio Unlock Button */}
                    <button
                        type="button"
                        onClick={() => {
                            setAudioUnlocked(true);
                            playChime('order');
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${audioUnlocked
                                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                                : 'bg-amber-950/60 border-amber-800 text-amber-400 animate-pulse'
                            }`}
                        title={audioUnlocked ? 'Audio Chime Enabled' : 'Tap to Enable Audio Chimes'}
                    >
                        {audioUnlocked ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        <span className="hidden sm:inline">
                            {audioUnlocked ? 'Audio Active' : 'Enable Chime'}
                        </span>
                    </button>

                    {/* Switch to KDS */}
                    <a
                        href={`/staff/${restaurant.slug}/kds`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white border border-zinc-700 transition"
                    >
                        <ChefHat className="w-3.5 h-3.5 text-orange-400" />
                        <span className="hidden sm:inline">Kitchen (KDS)</span>
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

            {/* Live Service Requests Alert Bar */}
            {openRequests.length > 0 && (
                <div className="bg-red-950/80 border-b border-red-800 px-4 lg:px-8 py-2.5 animate-fadeIn">
                    <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping" />
                            <Bell className="w-4 h-4 text-red-400" />
                            <span className="text-xs font-bold text-red-200">
                                {openRequests.length} Open Service Request{openRequests.length > 1 ? 's' : ''}:
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                                {openRequests.map((req) => {
                                    const reqTable = tables.find((t) => t.id === req.table_id);
                                    return (
                                        <span
                                            key={req.id}
                                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-900/60 border border-red-700 text-xs font-medium text-red-200"
                                        >
                                            <strong>{reqTable?.display_name || 'Table'}:</strong>
                                            <span>{req.type}</span>
                                            <button
                                                onClick={() => handleResolveRequest(req.id)}
                                                className="ml-1 text-[11px] underline hover:text-white font-bold cursor-pointer"
                                            >
                                                Resolve
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Operational Container */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
                {/* 1. Incoming Order Approval Queue - Compact Horizontal Scroll Row */}
                {pendingOrders.length > 0 && (
                    <section className="bg-amber-950/20 border-2 border-amber-500/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl space-y-3 animate-slideUp">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                                <h2 className="text-sm sm:text-base font-extrabold text-amber-300 truncate">
                                    New Guest Orders Waiting for Approval ({pendingOrders.length})
                                </h2>
                            </div>
                            <span className="text-[11px] sm:text-xs text-amber-400/80 font-medium shrink-0">
                                {pendingOrders.length > 2 ? 'Swipe / Scroll →' : 'Tap Approve to send to Kitchen KDS'}
                            </span>
                        </div>

                        {/* Compact Horizontal Scroll Row */}
                        <div className="flex gap-3 overflow-x-auto pb-2 pt-0.5 -mx-1 px-1 scroll-smooth">
                            {pendingOrders.map((order) => {
                                const orderTable = tables.find((t) => t.id === order.table_id);

                                return (
                                    <div
                                        key={order.id}
                                        className="w-[280px] sm:w-[320px] shrink-0 bg-zinc-900/95 border border-amber-500/40 rounded-2xl p-3.5 flex flex-col justify-between space-y-2.5 shadow-lg"
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                                                    {orderTable?.display_name || 'Table'}
                                                </span>
                                                <span className="text-xs font-extrabold text-white font-mono">
                                                    ₹{order.subtotal}
                                                </span>
                                            </div>

                                            <div className="text-xs text-zinc-400 truncate">
                                                Placed by: <strong className="text-zinc-200">{order.placed_by_name}</strong>
                                            </div>

                                            {/* Itemized preview */}
                                            {order.order_items && order.order_items.length > 0 && (
                                                <div className="p-2.5 bg-zinc-950 rounded-xl space-y-1 text-xs divide-y divide-zinc-800 max-h-24 overflow-y-auto">
                                                    {order.order_items.map((oi) => (
                                                        <div key={oi.id} className="pt-1 first:pt-0 flex justify-between text-zinc-300 gap-2">
                                                            <span className="truncate">
                                                                {oi.quantity}x {oi.item_name} {oi.variant_name && `(${oi.variant_name})`}
                                                            </span>
                                                            <span className="font-mono text-zinc-400 shrink-0">
                                                                ₹{Number(oi.unit_price) * oi.quantity}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => handleReject(order.id)}
                                                disabled={isActionPending}
                                                className="py-2 px-3 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-950/70 border border-red-800/60 transition cursor-pointer shrink-0"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleApprove(order.id)}
                                                disabled={isActionPending}
                                                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 transition shadow-md cursor-pointer flex items-center justify-center gap-1.5 min-w-0"
                                            >
                                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                <span className="truncate">Approve & Send</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* 2. Visual Table Grid */}
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <span>Live Floor Map ({tables.length} Tables)</span>
                            </h2>
                            <p className="text-xs text-zinc-400">
                                Realtime status colors: tap any table to view diners, orders, or mark served.
                            </p>
                        </div>

                        {/* Status Legend */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            {Object.entries(TABLE_STATUS_COLORS).map(([key, conf]) => (
                                <span
                                    key={key}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300"
                                >
                                    <span className={`w-2 h-2 rounded-full ${conf.dot}`} />
                                    <span>{conf.label}</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Tables Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {sortedTables.map((table) => {
                            const conf = TABLE_STATUS_COLORS[table.status] || TABLE_STATUS_COLORS.FREE;
                            const tableSession = sessions.find((s) => s.id === table.active_session_id && s.is_active);
                            const dinersCount = tableSession?.guests?.length || 0;
                            const tableOrders = orders.filter((o) => o.table_id === table.id && o.status !== 'SERVED' && o.status !== 'CANCELLED');
                            const hasReadyOrder = tableOrders.some((o) => o.status === 'READY');

                            return (
                                <div
                                    key={table.id}
                                    onClick={() => setSelectedTable(table)}
                                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-36 relative select-none hover:scale-[1.02] ${conf.border} ${conf.bg}`}
                                >
                                    {/* Top Row: Table Code + Pulse Dot */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-base font-extrabold text-white font-mono">
                                            {table.table_code}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {hasReadyOrder && (
                                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" title="Food Ready for Pickup" />
                                            )}
                                            <span
                                                className={`w-2.5 h-2.5 rounded-full ${conf.dot} ${conf.pulse ? 'animate-ping' : ''}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Middle: Diners & Active Orders */}
                                    <div className="space-y-1">
                                        <div className="text-xs font-semibold text-zinc-200">
                                            {table.display_name}
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {dinersCount}
                                            </span>
                                            {tableOrders.length > 0 && (
                                                <span className="flex items-center gap-1 text-orange-400 font-medium">
                                                    <Flame className="w-3 h-3" />
                                                    {tableOrders.length}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bottom: Status Pill */}
                                    <div className="pt-1">
                                        <span
                                            className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${conf.text} bg-black/40`}
                                        >
                                            {hasReadyOrder ? 'FOOD READY' : conf.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>

            {/* Table Detail Drawer */}
            {selectedTable && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
                    <div className="w-full sm:max-w-md bg-zinc-900 border-t sm:border-l border-zinc-800 rounded-t-[28px] sm:rounded-3xl p-6 pb-safe shadow-2xl flex flex-col space-y-5 animate-slideUp sm:animate-slideLeft relative overflow-y-auto max-h-[92vh] sm:max-h-[95vh]">
                        {/* Tactile Grab Handle for Mobile */}
                        <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto -mt-2 mb-2 sm:hidden shrink-0" />

                        <button
                            onClick={() => setSelectedTable(null)}
                            className="absolute top-5 right-5 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                            aria-label="Close table details drawer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Table Header */}
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                                    {selectedTable.table_code}
                                </span>
                                <h3 className="text-lg font-bold text-white">{selectedTable.display_name}</h3>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                                <span>Status: <strong className="text-white uppercase">{selectedTable.status === 'BILL' ? 'BILL PAID / SETTLE' : selectedTable.status}</strong></span>
                                <span>•</span>
                                <span>Capacity: {selectedTable.capacity} Seats</span>
                            </div>
                        </div>

                        {/* Bill Paid Alert Banner */}
                        {selectedTable.status === 'BILL' && (
                            <div className="p-3 bg-purple-950/60 border border-purple-800 rounded-2xl flex items-center gap-2.5 text-xs text-purple-200">
                                <Receipt className="w-5 h-5 text-purple-400 shrink-0" />
                                <div>
                                    <strong className="block text-white">Table Payment Settled</strong>
                                    <span>Guests have completed payment or requested physical bill. Reset table when ready.</span>
                                </div>
                            </div>
                        )}

                        {/* Seated Diners */}
                        {(() => {
                            const sess = sessions.find((s) => s.id === selectedTable.active_session_id && s.is_active);
                            const guests = sess?.guests || [];

                            return (
                                <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5 text-zinc-500" />
                                            <span>Active Diners ({guests.length})</span>
                                        </span>
                                    </div>
                                    {guests.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {guests.map((g) => (
                                                <span
                                                    key={g.guest_id}
                                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                    {g.name}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-zinc-500 italic">No diners currently seated.</p>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Orders List for this Table */}
                        {(() => {
                            const tableOrders = orders.filter((o) => o.table_id === selectedTable.id);

                            return (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                        Table Orders ({tableOrders.length})
                                    </h4>
                                    {tableOrders.length === 0 ? (
                                        <p className="text-xs text-zinc-500 italic p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                                            No orders placed yet.
                                        </p>
                                    ) : (
                                        tableOrders.map((ord) => (
                                            <div
                                                key={ord.id}
                                                className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2 text-xs"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-white">
                                                        Order #{ord.order_number || 1} • {ord.placed_by_name}
                                                    </span>
                                                    <span
                                                        className={`font-semibold px-2 py-0.5 rounded-md ${ord.status === 'READY'
                                                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                                                : ord.status === 'IN_KITCHEN'
                                                                    ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                                                    : ord.status === 'PENDING_APPROVAL'
                                                                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                                                        : 'bg-zinc-800 text-zinc-400'
                                                            }`}
                                                    >
                                                        {ord.status}
                                                    </span>
                                                </div>

                                                {ord.order_items && (
                                                    <div className="divide-y divide-zinc-800 pt-1">
                                                        {ord.order_items.map((oi) => (
                                                            <div key={oi.id} className="py-1 flex justify-between text-zinc-300">
                                                                <span>
                                                                    {oi.quantity}x {oi.item_name} {oi.variant_name && `(${oi.variant_name})`}
                                                                </span>
                                                                <span className="text-[11px] font-mono text-zinc-500">
                                                                    {oi.prep_status}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Mark Served Button if Ready */}
                                                {ord.status === 'READY' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleServeOrder(ord.id)}
                                                        disabled={isActionPending}
                                                        className="w-full mt-2 py-2 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <span>Food Ready • Mark Served to Table</span>
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            );
                        })()}

                        {/* Reset / Free Table Button */}
                        <div className="pt-4 border-t border-zinc-800">
                            <button
                                type="button"
                                onClick={() => handleResetTable(selectedTable.id, selectedTable.active_session_id)}
                                disabled={isActionPending}
                                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-zinc-300 hover:text-red-400 bg-zinc-950 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900 transition cursor-pointer flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>Reset / Free This Table</span>
                            </button>
                            <p className="text-[10px] text-zinc-500 text-center mt-1.5">
                                Closes current guest session and resets table to FREE for next party.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
