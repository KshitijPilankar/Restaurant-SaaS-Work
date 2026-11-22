'use client';

import React, { useState } from 'react';
import { Clock, ChefHat, CheckCircle2, Utensils, ArrowLeft, Receipt, Sparkles, X } from 'lucide-react';
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
}: LiveOrderTrackerProps) {
    const [showBillModal, setShowBillModal] = useState(false);

    if (!isOpen) return null;

    // Sort newest first
    const sortedOrders = [...orders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const latestOrder = sortedOrders[0];

    // Compute bill totals
    const grandSubtotal = orders.reduce((sum, ord) => sum + Number(ord.subtotal), 0);
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
                        onClick={() => setShowBillModal(true)}
                        className="flex-1 py-3 px-3 rounded-2xl font-bold text-xs text-white transition shadow cursor-pointer text-center flex items-center justify-center gap-1.5"
                        style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>View Bill (₹{grandTotal})</span>
                    </button>
                </div>
            </div>

            {/* Bill Summary Preview Modal (Placeholder for Phase 4) */}
            {showBillModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-slideUp text-center relative">
                        <button
                            onClick={() => setShowBillModal(false)}
                            className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-zinc-600"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-900">
                            <Receipt className="w-6 h-6" />
                        </div>

                        <div>
                            <span className="text-[11px] font-bold uppercase text-zinc-400 tracking-wider">
                                Current Running Bill
                            </span>
                            <h3 className="text-xl font-bold text-zinc-900">{restaurant.name}</h3>
                            <p className="text-xs text-zinc-500 font-medium">{table.display_name}</p>
                        </div>

                        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-2 text-xs text-left">
                            <div className="flex justify-between text-zinc-600">
                                <span>Items Subtotal</span>
                                <span className="font-mono font-semibold">₹{grandSubtotal}</span>
                            </div>
                            <div className="flex justify-between text-zinc-600">
                                <span>Taxes & GST ({taxRate}%)</span>
                                <span className="font-mono font-semibold">₹{grandTax}</span>
                            </div>
                            <div className="pt-2 border-t border-zinc-200 flex justify-between font-extrabold text-sm text-zinc-900">
                                <span>Grand Total</span>
                                <span className="font-mono">₹{grandTotal}</span>
                            </div>
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] text-left">
                            Split bill, UPI Razorpay payment, and review gate will be unlocked in Phase 4. You can ask your server for cash/card settlement right now.
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowBillModal(false)}
                            className="w-full py-3 rounded-xl font-bold text-xs bg-zinc-900 text-white hover:bg-zinc-800 transition"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
