'use client';

import React from 'react';
import { Clock, ChefHat, CheckCircle2, Utensils, ArrowLeft, Receipt, Sparkles } from 'lucide-react';
import { Order, OrderItem, Restaurant, RestaurantTable, OrderStatus } from '@/types/database';
import { BottomSheet } from '@/components/ui/bottom-sheet';

interface OrderWithItems extends Order {
    order_items?: OrderItem[];
}

interface LiveOrderTrackerProps {
    restaurant: Restaurant;
    table: RestaurantTable;
    orders: OrderWithItems[];
    isOpen: boolean;
    onClose: () => void;
    onOpenCheckout: () => void;
}

const STATUS_STEPS: { status: OrderStatus; label: string; desc: string; icon: React.ElementType }[] = [
    { status: 'PENDING_APPROVAL', label: 'Order Sent', desc: 'Waiting for waiter approval', icon: Clock },
    { status: 'IN_KITCHEN', label: 'In Kitchen', desc: 'Chefs are cooking your meal', icon: ChefHat },
    { status: 'READY', label: 'Food Ready', desc: 'Plated & ready for pickup', icon: CheckCircle2 },
    { status: 'SERVED', label: 'Served', desc: 'Delivered to your table', icon: Utensils },
];

export function LiveOrderTracker({
    restaurant,
    table,
    orders,
    isOpen,
    onClose,
    onOpenCheckout,
}: LiveOrderTrackerProps) {
    // Sort newest first
    const sortedOrders = [...orders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const latestOrder = sortedOrders[0];

    // Compute bill totals for non-cancelled orders
    const validOrders = orders.filter((o) => o.status !== 'CANCELLED');
    const grandSubtotal = validOrders.reduce((sum, ord) => sum + Number(ord.subtotal), 0);
    const taxRate = Number(restaurant.tax_percentage) || 5.0;
    const grandTax = Math.round((grandSubtotal * taxRate) / 100);
    const grandTotal = grandSubtotal + grandTax;

    const getStepIndex = (status: OrderStatus) => {
        switch (status) {
            case 'PENDING_APPROVAL':
                return 0;
            case 'IN_KITCHEN':
                return 1;
            case 'READY':
                return 2;
            case 'SERVED':
                return 3;
            default:
                return 0;
        }
    };

    return (
        <BottomSheet open={isOpen} onClose={onClose} label="Live order status" className="max-w-md max-h-[92vh]">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border py-1 pr-5 pl-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    <span>Back to Menu</span>
                </button>
                <div className="text-right">
                    <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Live Dine-In</p>
                    <p className="text-sm font-semibold text-foreground">{table.display_name}</p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-6 overflow-y-auto p-5">
                {/* Status tracker for the latest order */}
                {latestOrder ? (
                    <div className="space-y-4 rounded-2xl border border-border bg-muted/40 p-4 shadow-2xs">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1.5">
                                <p className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground">
                                    <span className="font-mono tabular-nums">Order #{latestOrder.order_number || 1}</span>
                                    <span aria-hidden="true">·</span>
                                    <span className="truncate">Placed by {latestOrder.placed_by_name}</span>
                                </p>
                                <h2 className="font-display text-xl leading-tight font-semibold tracking-tight text-foreground">
                                    Live Status Tracker
                                </h2>
                            </div>
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground ring-1 ring-black/5">
                                <Sparkles aria-hidden="true" className="size-4" />
                            </div>
                        </div>

                        {/* Steps */}
                        <ol className="space-y-1 pt-1">
                            {STATUS_STEPS.map((step, idx) => {
                                const currentIdx = getStepIndex(latestOrder.status);
                                const isCompleted = idx <= currentIdx;
                                const isCurrent = idx === currentIdx;
                                const Icon = step.icon;

                                return (
                                    <li
                                        key={step.status}
                                        aria-current={isCurrent ? 'step' : undefined}
                                        className="flex items-start gap-3"
                                    >
                                        <div className="flex flex-col items-center">
                                            <div
                                                className={`flex size-8 items-center justify-center rounded-full transition-colors ${
                                                    isCompleted ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                <Icon aria-hidden="true" className="size-4" />
                                            </div>
                                            {idx < STATUS_STEPS.length - 1 && (
                                                <div
                                                    aria-hidden="true"
                                                    className={`h-6 w-0.5 transition-colors ${
                                                        idx < currentIdx ? 'bg-brand' : 'bg-border'
                                                    }`}
                                                />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1 pt-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3
                                                    className={`text-sm font-semibold ${
                                                        isCompleted ? 'text-foreground' : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {step.label}
                                                </h3>
                                                {isCurrent && (
                                                    <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-brand-foreground">
                                                        In Progress
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">{step.desc}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                ) : (
                    <div className="space-y-2 p-8 text-center">
                        <Utensils aria-hidden="true" className="mx-auto size-8 text-muted-foreground/50" />
                        <p className="text-sm font-semibold text-foreground">No active orders</p>
                        <p className="text-xs text-muted-foreground">Dishes you order will be tracked here in real-time.</p>
                    </div>
                )}

                {/* Order history */}
                {orders.length > 0 && (
                    <section aria-labelledby="order-history-heading" className="space-y-3">
                        <div className="flex items-baseline justify-between gap-3">
                            <h2
                                id="order-history-heading"
                                className="text-xs font-bold tracking-wider text-foreground uppercase"
                            >
                                Order History
                            </h2>
                            <span className="text-xs text-muted-foreground">
                                {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                            </span>
                        </div>
                        <ul className="space-y-3">
                            {orders.map((order) => (
                                <li
                                    key={order.id}
                                    className="space-y-2 rounded-2xl border border-border bg-card p-3.5 text-sm"
                                >
                                    <div className="flex items-center justify-between font-semibold text-foreground">
                                        <span className="font-mono tabular-nums">Order #{order.order_number || 1}</span>
                                        <span className="font-mono tabular-nums">₹{order.subtotal}</span>
                                    </div>

                                    {order.order_items && order.order_items.length > 0 && (
                                        <ul className="divide-y divide-border/60">
                                            {order.order_items.map((oi) => (
                                                <li key={oi.id} className="flex items-center justify-between gap-3 py-2">
                                                    <div className="min-w-0">
                                                        <span className="font-semibold text-foreground">
                                                            <span className="font-mono tabular-nums">{oi.quantity}×</span> {oi.item_name}
                                                        </span>
                                                        {oi.variant_name && (
                                                            <span className="ml-1 text-xs text-muted-foreground">({oi.variant_name})</span>
                                                        )}
                                                        <p className="text-xs text-muted-foreground italic">For {oi.ordered_by_name}</p>
                                                    </div>
                                                    <span className="shrink-0 font-mono font-medium text-foreground tabular-nums">
                                                        ₹{Number(oi.unit_price) * oi.quantity}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>

            {/* Bottom actions */}
            <div className="flex shrink-0 items-center gap-3 border-t border-border bg-card p-4 pb-safe shadow-lg">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-border bg-muted px-3 text-sm font-bold text-foreground transition-colors hover:bg-muted/70 active:scale-95"
                >
                    Order More Dishes
                </button>

                <button
                    type="button"
                    onClick={() => {
                        onClose();
                        onOpenCheckout();
                    }}
                    className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand px-3 text-sm font-bold text-brand-foreground shadow transition-transform active:scale-95"
                >
                    <Receipt aria-hidden="true" className="size-4" />
                    <span>Pay Bill</span>
                    <span className="font-mono tabular-nums">₹{grandTotal}</span>
                </button>
            </div>
        </BottomSheet>
    );
}
