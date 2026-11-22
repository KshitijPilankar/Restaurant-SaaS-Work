'use client';

import React from 'react';
import { Clock, ChefHat, CheckCircle2, Utensils, ArrowLeft, Receipt, Sparkles } from 'lucide-react';
import { Order, OrderItem, Restaurant, RestaurantTable, OrderStatus } from '@/types/database';

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
    if (!isOpen) return null;

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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 animate-fadeIn">
            <div className="w-full max-w-md bg-white rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl animate-slideUp relative overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Menu</span>
                    </button>
                    <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Live Dine-In
                        </span>
                        <div className="text-xs font-bold text-zinc-900">{table.display_name}</div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* Stepper Card for Latest Order */}
                    {latestOrder ? (
                        <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl space-y-4 shadow-2xs">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white border border-zinc-200 text-zinc-800">
                                        <span>Order #{latestOrder.order_number || 1}</span>
                                        <span>•</span>
                                        <span>Placed by {latestOrder.placed_by_name}</span>
                                    </div>
                                    <h3 className="text-base font-extrabold text-zinc-900 mt-1">
                                        Live Status Tracker
                                    </h3>
                                </div>
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs animate-pulse"
                                    style={{ backgroundColor: 'var(--brand-primary)' }}
                                >
                                    <Sparkles className="w-4 h-4" />
                                </div>
                            </div>

                            {/* Stepper Steps */}
                            <div className="space-y-3 pt-2">
                                {STATUS_STEPS.map((step, idx) => {
                                    const currentIdx = getStepIndex(latestOrder.status);
                                    const isCompleted = idx <= currentIdx;
                                    const isCurrent = idx === currentIdx;
                                    const Icon = step.icon;

                                    return (
                                        <div key={step.status} className="flex items-start gap-3">
                                            <div className="flex flex-col items-center">
                                                <div
                                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition shadow-xs ${
                                                        isCompleted
                                                            ? 'text-white'
                                                            : 'bg-zinc-200 text-zinc-400'
                                                    }`}
                                                    style={{
                                                        backgroundColor: isCompleted ? 'var(--brand-primary)' : undefined,
                                                    }}
                                                >
                                                    <Icon className="w-3.5 h-3.5" />
                                                </div>
                                                {idx < STATUS_STEPS.length - 1 && (
                                                    <div
                                                        className={`w-0.5 h-6 transition ${
                                                            idx < currentIdx ? 'bg-zinc-900' : 'bg-zinc-200'
                                                        }`}
                                                        style={{
                                                            backgroundColor: idx < currentIdx ? 'var(--brand-primary)' : undefined,
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex items-center justify-between">
                                                    <h4
                                                        className={`text-xs font-bold ${
                                                            isCompleted ? 'text-zinc-900' : 'text-zinc-400'
                                                        }`}
                                                    >
                                                        {step.label}
                                                    </h4>
                                                    {isCurrent && (
                                                        <span
                                                            className="text-[10px] font-bold px-2 py-0.2 rounded-full text-white animate-pulse"
                                                            style={{ backgroundColor: 'var(--brand-primary)' }}
                                                        >
                                                            In Progress
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-zinc-400">{step.desc}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-zinc-400 space-y-2">
                            <Utensils className="w-8 h-8 mx-auto text-zinc-300" />
                            <p className="text-sm font-semibold text-zinc-700">No active orders</p>
                            <p className="text-xs text-zinc-400">Dishes you order will be tracked here in real-time.</p>
                        </div>
                    )}

                    {/* Orders Breakdown */}
                    {orders.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                                Order Items History ({orders.length} orders)
                            </h4>
                            <div className="space-y-3">
                                {orders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-2xl space-y-2 text-xs"
                                    >
                                        <div className="flex items-center justify-between font-bold text-zinc-800">
                                            <span>Order #{order.order_number || 1}</span>
                                            <span className="font-mono">₹{order.subtotal}</span>
                                        </div>

                                        {order.order_items && order.order_items.length > 0 && (
                                            <div className="divide-y divide-zinc-200/60 pt-1">
                                                {order.order_items.map((oi) => (
                                                    <div
                                                        key={oi.id}
                                                        className="py-1.5 flex items-center justify-between text-zinc-600"
                                                    >
                                                        <div>
                                                            <span className="font-semibold text-zinc-800">
                                                                {oi.quantity}x {oi.item_name}
                                                            </span>
                                                            {oi.variant_name && (
                                                                <span className="text-[10px] text-zinc-400 ml-1">
                                                                    ({oi.variant_name})
                                                                </span>
                                                            )}
                                                            <div className="text-[10px] text-zinc-400 italic">
                                                                For {oi.ordered_by_name}
                                                            </div>
                                                        </div>
                                                        <span className="font-mono font-medium">
                                                            ₹{Number(oi.unit_price) * oi.quantity}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Actions */}
                <div className="p-4 bg-white border-t border-zinc-100 flex items-center gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 px-3 rounded-2xl font-bold text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition cursor-pointer text-center"
                    >
                        Order More Dishes
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onOpenCheckout();
                        }}
                        className="flex-1 py-3 px-3 rounded-2xl font-bold text-xs text-white transition shadow cursor-pointer text-center flex items-center justify-center gap-1.5"
                        style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Pay Bill (₹{grandTotal})</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
