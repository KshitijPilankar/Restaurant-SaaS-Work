'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    UtensilsCrossed,
    Bell,
    ChefHat,
    Users,
    CheckCircle2,
    RotateCcw,
    LogOut,
    Volume2,
    VolumeX,
    AlertCircle,
    Clock,
    X,
    Receipt,
    Flame,
    Circle,
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
import { BottomSheet } from '@/components/ui/bottom-sheet';
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

// Table states on the floor map. Every state is carried by an icon, a word and a color, never color alone.
// Only the urgent state (HELP, a service call) animates, and only its border.
const TABLE_STATUS_COLORS: Record<
    TableStatus,
    { label: string; border: string; bg: string; text: string; Icon: React.ElementType; urgent: boolean }
> = {
    FREE: { label: 'Free', border: 'border-zinc-700', bg: 'bg-zinc-900/50', text: 'text-zinc-300', Icon: Circle, urgent: false },
    ORDERING: { label: 'Ordering', border: 'border-blue-500/70', bg: 'bg-blue-950/30', text: 'text-blue-300', Icon: Clock, urgent: false },
    PENDING_APPROVAL: { label: 'New Order', border: 'border-amber-400', bg: 'bg-amber-950/40', text: 'text-amber-300', Icon: AlertCircle, urgent: false },
    EATING: { label: 'Eating', border: 'border-emerald-500/70', bg: 'bg-emerald-950/30', text: 'text-emerald-300', Icon: UtensilsCrossed, urgent: false },
    HELP: { label: 'Service Call', border: 'border-red-500', bg: 'bg-red-950/50', text: 'text-red-300', Icon: Bell, urgent: true },
    BILL: { label: 'Bill Paid', border: 'border-purple-400', bg: 'bg-purple-950/40', text: 'text-purple-300', Icon: Receipt, urgent: false },
};

const REQUEST_LABELS: Record<string, string> = {
    WATER: 'Water',
    NAPKINS: 'Napkins & cutlery',
    WAITER: 'Call server',
    BILL: 'Bring bill',
};

const ORDER_STATUS_LABELS: Record<string, { label: string; chip: string }> = {
    READY: { label: 'Ready', chip: 'border-emerald-600 bg-emerald-950 text-emerald-300' },
    IN_KITCHEN: { label: 'In kitchen', chip: 'border-blue-600 bg-blue-950 text-blue-300' },
    PENDING_APPROVAL: { label: 'Needs approval', chip: 'border-amber-500 bg-amber-950 text-amber-300' },
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

    const selectedSession = selectedTable
        ? sessions.find((s) => s.id === selectedTable.active_session_id && s.is_active)
        : undefined;
    const selectedGuests = selectedSession?.guests || [];
    const selectedOrders = selectedTable ? orders.filter((o) => o.table_id === selectedTable.id) : [];

    const toggleChime = () => {
        setAudioUnlocked(true);
        playChime('order');
    };

    return (
        <div className="dark flex min-h-screen flex-col bg-background font-sans text-foreground selection:bg-primary selection:text-primary-foreground">
            {/* Top navigation */}
            <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md lg:px-8">
                <div className="flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <UtensilsCrossed aria-hidden="true" className="size-6" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <h1 className="text-xl font-bold tracking-tight text-foreground">{restaurant.name}</h1>
                            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-0.5 text-sm font-semibold text-blue-300">
                                Floor Service
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Logged in as <strong className="font-semibold text-foreground">{staffName}</strong> ({staffRole})
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={toggleChime}
                        className={`inline-flex min-h-12 items-center gap-2 rounded-xl border px-4 text-base font-semibold transition-colors ${
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
                        href={`/staff/${restaurant.slug}/kds`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-base font-medium text-zinc-100 transition-colors hover:bg-zinc-700"
                    >
                        <ChefHat aria-hidden="true" className="size-5 text-primary" />
                        <span className="hidden sm:inline">Kitchen (KDS)</span>
                        <span className="sr-only sm:hidden">Kitchen (KDS)</span>
                    </a>

                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isActionPending}
                        className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-base font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50"
                    >
                        <LogOut aria-hidden="true" className="size-5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </header>

            {/* Sound must be enabled once per session, or browsers block the chime */}
            {!audioUnlocked && (
                <button
                    type="button"
                    onClick={toggleChime}
                    className="flex min-h-12 w-full items-center justify-center gap-2 border-b border-amber-500/40 bg-amber-950/50 px-4 text-base font-semibold text-amber-200 transition-colors hover:bg-amber-950/70"
                >
                    <VolumeX aria-hidden="true" className="size-5" />
                    <span>Order chime is muted. Tap here to turn it on.</span>
                </button>
            )}

            {/* Open service requests: the one urgent strip, a single scrolling row */}
            {openRequests.length > 0 && (
                <section aria-label="Open service requests" className="border-b border-red-800 bg-red-950/70 px-4 py-3 lg:px-8">
                    <div className="mx-auto flex max-w-[1800px] items-center gap-3">
                        <p className="flex shrink-0 items-center gap-2 text-base font-bold text-red-200">
                            <Bell aria-hidden="true" className="size-5 text-red-300" />
                            <span>
                                {openRequests.length} Open Service Request{openRequests.length > 1 ? 's' : ''}
                            </span>
                        </p>
                        <ul className="scrollbar-none flex flex-1 items-center gap-2 overflow-x-auto">
                            {openRequests.map((req) => {
                                const reqTable = tables.find((t) => t.id === req.table_id);
                                return (
                                    <li
                                        key={req.id}
                                        className="flex shrink-0 items-center gap-2 rounded-xl border border-red-700 bg-red-900/60 py-1 pr-1 pl-3 text-base text-red-100"
                                    >
                                        <span>
                                            <strong className="font-semibold">{reqTable?.display_name || 'Table'}</strong>
                                            {' · '}
                                            {REQUEST_LABELS[req.type] || req.type}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleResolveRequest(req.id)}
                                            className="min-h-12 rounded-lg bg-red-100 px-4 text-base font-bold text-red-950 transition-colors hover:bg-white"
                                        >
                                            Resolve
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </section>
            )}

            <main className="mx-auto w-full max-w-[1800px] flex-1 space-y-6 px-4 py-5 lg:px-8">
                {/* 1. Approval queue: a fixed-height row that scrolls sideways, so the map stays on screen */}
                {pendingOrders.length > 0 && (
                    <section
                        aria-labelledby="approval-queue-heading"
                        className="space-y-3 rounded-2xl border-2 border-amber-400 bg-amber-950/25 p-4 shadow-xl"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <h2 id="approval-queue-heading" className="text-xl font-extrabold text-amber-200">
                                New Guest Orders Waiting for Approval ({pendingOrders.length})
                            </h2>
                            {pendingOrders.length > 2 && (
                                <span className="hidden shrink-0 text-base font-medium text-amber-300 sm:inline">Scroll sideways →</span>
                            )}
                        </div>

                        <ul className="flex snap-x gap-3 overflow-x-auto pb-1">
                            {pendingOrders.map((order) => {
                                const orderTable = tables.find((t) => t.id === order.table_id);

                                return (
                                    <li
                                        key={order.id}
                                        className="flex w-[300px] shrink-0 snap-start flex-col gap-2.5 rounded-2xl border border-amber-500/50 bg-card p-3.5 shadow-lg sm:w-[340px]"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="rounded-lg border border-amber-500/50 bg-amber-500/15 px-2.5 py-0.5 font-mono text-lg font-bold text-amber-200">
                                                {orderTable?.display_name || 'Table'}
                                            </span>
                                            <span className="font-mono text-lg font-extrabold text-white tabular-nums">₹{order.subtotal}</span>
                                        </div>

                                        <p className="truncate text-base text-zinc-300">
                                            Placed by <strong className="font-semibold text-white">{order.placed_by_name}</strong>
                                        </p>

                                        {order.order_items && order.order_items.length > 0 && (
                                            <ul className="max-h-24 divide-y divide-zinc-800 overflow-y-auto rounded-xl bg-background px-3 py-1 text-base">
                                                {order.order_items.map((oi) => (
                                                    <li key={oi.id} className="flex justify-between gap-2 py-1 text-zinc-200">
                                                        <span className="truncate">
                                                            <span className="font-mono tabular-nums">{oi.quantity}×</span> {oi.item_name}
                                                            {oi.variant_name && ` (${oi.variant_name})`}
                                                        </span>
                                                        <span className="shrink-0 font-mono text-zinc-400 tabular-nums">
                                                            ₹{Number(oi.unit_price) * oi.quantity}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        <div className="mt-auto flex items-center gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => handleReject(order.id)}
                                                disabled={isActionPending}
                                                className="min-h-14 shrink-0 rounded-xl border border-red-700 bg-red-950/60 px-4 text-base font-bold text-red-300 transition-colors hover:bg-red-950 disabled:opacity-50"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleApprove(order.id)}
                                                disabled={isActionPending}
                                                className="flex min-h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 text-lg font-bold text-white transition-colors hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-50"
                                            >
                                                <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" />
                                                <span className="truncate">Approve & Send</span>
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                {/* 2. Live floor map */}
                <section aria-labelledby="floor-map-heading" className="space-y-4">
                    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                        <div>
                            <h2 id="floor-map-heading" className="text-2xl font-bold text-white">
                                Live Floor Map ({tables.length} Tables)
                            </h2>
                            <p className="text-base text-muted-foreground">Tap a table to see its diners and orders, or to mark food served.</p>
                        </div>

                        <ul className="flex flex-wrap items-center gap-2" aria-label="Status key">
                            {Object.entries(TABLE_STATUS_COLORS).map(([key, conf]) => {
                                const LegendIcon = conf.Icon;
                                return (
                                    <li
                                        key={key}
                                        className={`inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-sm font-semibold ${conf.text}`}
                                    >
                                        <LegendIcon aria-hidden="true" className="size-4" />
                                        <span>{conf.label}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                        {sortedTables.map((table) => {
                            const conf = TABLE_STATUS_COLORS[table.status] || TABLE_STATUS_COLORS.FREE;
                            const StatusIcon = conf.Icon;
                            const tableSession = sessions.find((s) => s.id === table.active_session_id && s.is_active);
                            const dinersCount = tableSession?.guests?.length || 0;
                            const tableOrders = orders.filter((o) => o.table_id === table.id && o.status !== 'SERVED' && o.status !== 'CANCELLED');
                            const hasReadyOrder = tableOrders.some((o) => o.status === 'READY');
                            const statusLabel = hasReadyOrder ? 'Food Ready' : conf.label;

                            return (
                                <li key={table.id}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTable(table)}
                                        aria-label={`${table.table_code}, ${table.display_name}, ${statusLabel}, ${dinersCount} ${dinersCount === 1 ? 'diner' : 'diners'}`}
                                        className={`relative flex min-h-36 w-full select-none flex-col justify-between rounded-2xl border-2 p-4 text-left transition-colors hover:brightness-110 active:scale-[0.98] ${conf.border} ${conf.bg}`}
                                    >
                                        {/* Only a service call animates, and only its border */}
                                        {conf.urgent && (
                                            <span
                                                aria-hidden="true"
                                                className="animate-borderBeat pointer-events-none absolute -inset-0.5 rounded-2xl border-4 border-red-400"
                                            />
                                        )}

                                        <span className="flex items-start justify-between gap-2">
                                            <span className="font-mono text-3xl leading-none font-black text-white">{table.table_code}</span>
                                            <span className="flex items-center gap-3 text-base font-semibold text-zinc-200">
                                                <span className="flex items-center gap-1">
                                                    <Users aria-hidden="true" className="size-4 text-zinc-400" />
                                                    <span className="font-mono tabular-nums">{dinersCount}</span>
                                                </span>
                                                {tableOrders.length > 0 && (
                                                    <span className="flex items-center gap-1 text-orange-300">
                                                        <Flame aria-hidden="true" className="size-4" />
                                                        <span className="font-mono tabular-nums">{tableOrders.length}</span>
                                                    </span>
                                                )}
                                            </span>
                                        </span>

                                        <span className="block text-base font-medium text-zinc-300">{table.display_name}</span>

                                        <span
                                            className={`inline-flex items-center gap-2 self-start rounded-lg bg-black/40 px-2.5 py-1 text-base font-bold ${
                                                hasReadyOrder ? 'text-emerald-300' : conf.text
                                            }`}
                                        >
                                            {hasReadyOrder ? (
                                                <CheckCircle2 aria-hidden="true" className="size-5" />
                                            ) : (
                                                <StatusIcon aria-hidden="true" className="size-5" />
                                            )}
                                            <span>{statusLabel}</span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            </main>

            {/* Table detail sheet */}
            <BottomSheet
                open={!!selectedTable}
                onClose={() => setSelectedTable(null)}
                label="Table details"
                placement="adaptive"
                className="max-h-[92vh] max-w-lg"
                contentClassName="space-y-5 overflow-y-auto px-6 pt-1 pb-6 pb-safe sm:pt-6"
            >
                {selectedTable && (
                    <>
                        <button
                            type="button"
                            onClick={() => setSelectedTable(null)}
                            className="absolute top-2 right-2 flex size-12 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                            aria-label="Close table details drawer"
                        >
                            <X aria-hidden="true" className="size-6" />
                        </button>

                        <div className="pr-12">
                            <div className="flex items-center gap-3">
                                <span className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-lg font-bold text-primary">
                                    {selectedTable.table_code}
                                </span>
                                <h3 className="text-2xl font-bold text-white">{selectedTable.display_name}</h3>
                            </div>
                            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-base text-zinc-300">
                                <span>
                                    Status:{' '}
                                    <strong className="font-semibold text-white">
                                        {(TABLE_STATUS_COLORS[selectedTable.status] || TABLE_STATUS_COLORS.FREE).label}
                                    </strong>
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>Capacity: {selectedTable.capacity} Seats</span>
                            </p>
                        </div>

                        {selectedTable.status === 'BILL' && (
                            <div className="flex items-center gap-3 rounded-2xl border border-purple-700 bg-purple-950/60 p-3.5 text-base text-purple-100">
                                <Receipt aria-hidden="true" className="size-6 shrink-0 text-purple-300" />
                                <div>
                                    <strong className="block text-white">Table Payment Settled</strong>
                                    <span>Guests have paid or asked for the bill. Reset the table when they leave.</span>
                                </div>
                            </div>
                        )}

                        {/* Seated diners */}
                        <div className="space-y-2 rounded-2xl border border-zinc-800 bg-background p-4">
                            <p className="flex items-center gap-2 text-base font-semibold text-zinc-200">
                                <Users aria-hidden="true" className="size-4 text-zinc-400" />
                                <span>Active Diners ({selectedGuests.length})</span>
                            </p>
                            {selectedGuests.length > 0 ? (
                                <ul className="flex flex-wrap gap-2">
                                    {selectedGuests.map((g) => (
                                        <li
                                            key={g.guest_id}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-base font-medium text-zinc-100"
                                        >
                                            <span aria-hidden="true" className="size-2 rounded-full bg-emerald-400" />
                                            {g.name}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-base text-zinc-400 italic">No diners currently seated.</p>
                            )}
                        </div>

                        {/* Orders */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold tracking-wider text-zinc-300 uppercase">
                                Table Orders ({selectedOrders.length})
                            </h4>
                            {selectedOrders.length === 0 ? (
                                <p className="rounded-xl border border-zinc-800 bg-background p-3 text-base text-zinc-400 italic">
                                    No orders placed yet.
                                </p>
                            ) : (
                                selectedOrders.map((ord) => {
                                    const st = ORDER_STATUS_LABELS[ord.status];
                                    return (
                                        <div key={ord.id} className="space-y-2 rounded-2xl border border-zinc-800 bg-background p-4 text-base">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-bold text-white">
                                                    <span className="font-mono tabular-nums">Order #{ord.order_number || 1}</span> · {ord.placed_by_name}
                                                </span>
                                                <span
                                                    className={`shrink-0 rounded-lg border px-2.5 py-0.5 text-sm font-semibold ${
                                                        st ? st.chip : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                                                    }`}
                                                >
                                                    {st ? st.label : ord.status}
                                                </span>
                                            </div>

                                            {ord.order_items && (
                                                <ul className="divide-y divide-zinc-800">
                                                    {ord.order_items.map((oi) => (
                                                        <li key={oi.id} className="flex justify-between gap-2 py-1.5 text-zinc-200">
                                                            <span>
                                                                <span className="font-mono tabular-nums">{oi.quantity}×</span> {oi.item_name}
                                                                {oi.variant_name && ` (${oi.variant_name})`}
                                                            </span>
                                                            <span className="shrink-0 text-sm text-zinc-400">{oi.prep_status}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}

                                            {ord.status === 'READY' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleServeOrder(ord.id)}
                                                    disabled={isActionPending}
                                                    className="mt-2 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-lg font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                                                >
                                                    <CheckCircle2 aria-hidden="true" className="size-5" />
                                                    <span>Food Ready · Mark Served to Table</span>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Reset */}
                        <div className="border-t border-zinc-800 pt-4">
                            <button
                                type="button"
                                onClick={() => handleResetTable(selectedTable.id, selectedTable.active_session_id)}
                                disabled={isActionPending}
                                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-background px-4 text-base font-bold text-zinc-200 transition-colors hover:border-red-800 hover:bg-red-950/30 hover:text-red-300 disabled:opacity-50"
                            >
                                <RotateCcw aria-hidden="true" className="size-5" />
                                <span>Reset / Free This Table</span>
                            </button>
                            <p className="mt-2 text-center text-sm text-zinc-400">
                                Closes the current guest session and frees the table for the next party.
                            </p>
                        </div>
                    </>
                )}
            </BottomSheet>
        </div>
    );
}
