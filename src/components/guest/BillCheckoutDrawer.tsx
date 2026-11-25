'use client';

import React, { useState, useMemo, useTransition } from 'react';
import {
    Receipt,
    CreditCard,
    Banknote,
    Plus,
    Minus,
    ArrowRight,
    Check,
    X,
    AlertCircle,
    Smartphone,
} from 'lucide-react';
import { Restaurant, RestaurantTable, Order, OrderItem, PaymentMethod } from '@/types/database';
import { recordTablePayment } from '@/app/r/[slug]/checkout-actions';
import { PostPaymentReviewModal } from '@/components/guest/PostPaymentReviewModal';
import { BottomSheet } from '@/components/ui/bottom-sheet';

interface OrderWithItems extends Order {
    order_items?: OrderItem[];
}

interface BillCheckoutDrawerProps {
    restaurant: Restaurant;
    table: RestaurantTable;
    sessionId: string;
    orders: OrderWithItems[];
    currentGuestName: string;
    isOpen: boolean;
    onClose: () => void;
}

type SplitTab = 'FULL' | 'EQUAL' | 'ITEMIZED';

export function BillCheckoutDrawer({
    restaurant,
    table,
    sessionId,
    orders,
    currentGuestName,
    isOpen,
    onClose,
}: BillCheckoutDrawerProps) {
    const [splitTab, setSplitTab] = useState<SplitTab>('FULL');
    const [equalSplitCount, setEqualSplitCount] = useState<number>(2);
    const [selectedDinerName, setSelectedDinerName] = useState<string>(currentGuestName);
    const [selectedTip, setSelectedTip] = useState<number>(0);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('UPI');

    const [isProcessing, startPaymentTransition] = useTransition();
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Filter valid non-cancelled orders
    const validOrders = useMemo(() => {
        return orders.filter((o) => o.status !== 'CANCELLED');
    }, [orders]);

    // Compute Base Bill
    const totalSubtotal = useMemo(() => {
        return validOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
    }, [validOrders]);

    const taxRate = Number(restaurant.tax_percentage) || 5.0;
    const totalTax = Math.round((totalSubtotal * taxRate) / 100);
    const fullBillWithoutTip = totalSubtotal + totalTax;

    // Itemized grouped by diner
    const dinerBreakdown = useMemo(() => {
        const map = new Map<string, { items: OrderItem[]; subtotal: number }>();

        for (const ord of validOrders) {
            for (const item of ord.order_items || []) {
                const diner = item.ordered_by_name || 'Guest';
                const current = map.get(diner) || { items: [], subtotal: 0 };
                const itemCost = Number(item.unit_price) * item.quantity;
                current.items.push(item);
                current.subtotal += itemCost;
                map.set(diner, current);
            }
        }

        return Array.from(map.entries()).map(([name, data]) => {
            const dinerTax = Math.round((data.subtotal * taxRate) / 100);
            return {
                name,
                items: data.items,
                subtotal: data.subtotal,
                tax: dinerTax,
                total: data.subtotal + dinerTax,
            };
        });
    }, [validOrders, taxRate]);

    // Active payable calculations based on selected Split Tab
    const payableDetails = useMemo(() => {
        if (splitTab === 'FULL') {
            const finalPayable = fullBillWithoutTip + selectedTip;
            return {
                label: 'Full Table Bill',
                subtotal: totalSubtotal,
                tax: totalTax,
                tip: selectedTip,
                total: finalPayable,
            };
        } else if (splitTab === 'EQUAL') {
            const count = Math.max(1, equalSplitCount);
            const perPersonSubtotal = Math.round(totalSubtotal / count);
            const perPersonTax = Math.round(totalTax / count);
            const perPersonTotal = Math.round(fullBillWithoutTip / count) + selectedTip;
            return {
                label: `Equal Share (1 of ${count})`,
                subtotal: perPersonSubtotal,
                tax: perPersonTax,
                tip: selectedTip,
                total: perPersonTotal,
            };
        } else {
            // ITEMIZED
            const dinerData = dinerBreakdown.find((d) => d.name === selectedDinerName) || dinerBreakdown[0];
            const dinerSubtotal = dinerData ? dinerData.subtotal : totalSubtotal;
            const dinerTax = dinerData ? dinerData.tax : totalTax;
            const dinerTotal = (dinerData ? dinerData.total : fullBillWithoutTip) + selectedTip;
            return {
                label: `${selectedDinerName}'s Items`,
                subtotal: dinerSubtotal,
                tax: dinerTax,
                tip: selectedTip,
                total: dinerTotal,
            };
        }
    }, [
        splitTab,
        equalSplitCount,
        selectedDinerName,
        totalSubtotal,
        totalTax,
        fullBillWithoutTip,
        selectedTip,
        dinerBreakdown,
    ]);

    const handleExecutePayment = () => {
        setErrorMessage(null);

        startPaymentTransition(async () => {
            // If Razorpay Card payment selected:
            let razorpayOrderId: string | null = null;
            let razorpayPaymentId: string | null = null;

            if (selectedMethod === 'CARD') {
                try {
                    const res = await fetch('/api/payments/razorpay', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            amount: payableDetails.total,
                            restaurantId: restaurant.id,
                            tableId: table.id,
                        }),
                    });
                    const rzpData = await res.json();
                    if (!rzpData.demoMode && rzpData.orderId) {
                        razorpayOrderId = rzpData.orderId;
                        razorpayPaymentId = `pay_${Date.now().toString().slice(-8)}`;
                    } else {
                        // Demo mode simulation
                        razorpayPaymentId = `pay_sim_${Date.now().toString().slice(-8)}`;
                    }
                } catch {
                    razorpayPaymentId = `pay_sim_${Date.now().toString().slice(-8)}`;
                }
            }

            // Record payment in Supabase
            const res = await recordTablePayment({
                restaurantId: restaurant.id,
                tableId: table.id,
                sessionId,
                paidByName: currentGuestName || 'Table Guest',
                subtotal: payableDetails.subtotal,
                taxAmount: payableDetails.tax,
                tipAmount: payableDetails.tip,
                totalAmount: payableDetails.total,
                method: selectedMethod,
                razorpayOrderId,
                razorpayPaymentId,
            });

            if (res.success) {
                setPaymentSuccess(true);
                setTimeout(() => {
                    setShowReviewModal(true);
                }, 800);
            } else {
                setErrorMessage(res.error || 'Failed to complete payment. Please try again.');
            }
        });
    };

    return (
        <BottomSheet
            open={isOpen}
            onClose={onClose}
            label="Checkout and bill"
            className="max-w-md max-h-[94vh]"
            backdropClassName="bg-black/70 backdrop-blur-sm"
        >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border py-2 pr-3 pl-5">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground ring-1 ring-black/5">
                        <Receipt aria-hidden="true" className="size-[18px]" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="font-display text-lg leading-tight font-semibold tracking-tight text-foreground">Checkout & Bill</h2>
                        <p className="truncate text-xs text-muted-foreground">
                            {table.display_name} · Total bill{' '}
                            <span className="font-mono font-semibold text-foreground tabular-nums">₹{fullBillWithoutTip}</span>
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Close bill drawer"
                >
                    <X aria-hidden="true" className="size-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {paymentSuccess ? (
                    <div role="status" className="animate-fadeIn space-y-3 py-12 text-center">
                        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-xl">
                            <Check aria-hidden="true" className="size-8 stroke-[3]" />
                        </div>
                        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">Payment Successful!</h2>
                        <p className="mx-auto max-w-xs text-sm text-muted-foreground">
                            Paid <span className="font-mono font-semibold text-foreground tabular-nums">₹{payableDetails.total}</span> via{' '}
                            {selectedMethod}. Table status updated.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* How to pay: full bill, equal split, or by person */}
                        <div role="group" aria-labelledby="split-label" className="space-y-2">
                            <p id="split-label" className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                Choose How to Pay
                            </p>
                            <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-border/60 bg-muted p-1">
                                {(
                                    [
                                        { tab: 'FULL', label: 'Full Bill' },
                                        { tab: 'EQUAL', label: 'Split Equally' },
                                        { tab: 'ITEMIZED', label: 'By Person' },
                                    ] as { tab: SplitTab; label: string }[]
                                ).map(({ tab, label }) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setSplitTab(tab)}
                                        aria-pressed={splitTab === tab}
                                        className={`min-h-11 rounded-xl px-2 text-sm font-semibold transition-colors active:scale-95 ${
                                            splitTab === tab
                                                ? 'bg-card text-foreground shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Equal split: number of diners */}
                        {splitTab === 'EQUAL' && (
                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 p-3.5">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Split by Diners</p>
                                    <p className="font-mono text-xs text-muted-foreground tabular-nums">
                                        ₹{fullBillWithoutTip} ÷ {equalSplitCount} people
                                    </p>
                                </div>
                                <div className="flex items-center rounded-xl border border-border bg-card p-0.5 shadow-2xs">
                                    <button
                                        type="button"
                                        onClick={() => setEqualSplitCount(Math.max(2, equalSplitCount - 1))}
                                        disabled={equalSplitCount <= 2}
                                        className="flex size-11 items-center justify-center rounded-lg text-foreground transition hover:bg-muted active:scale-90 disabled:opacity-30"
                                        aria-label="Decrease split diners"
                                    >
                                        <Minus aria-hidden="true" className="size-4" />
                                    </button>
                                    <span aria-live="polite" className="w-8 text-center font-mono text-base font-extrabold text-foreground tabular-nums">
                                        {equalSplitCount}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setEqualSplitCount(Math.min(10, equalSplitCount + 1))}
                                        className="flex size-11 items-center justify-center rounded-lg text-foreground transition hover:bg-muted active:scale-90"
                                        aria-label="Increase split diners"
                                    >
                                        <Plus aria-hidden="true" className="size-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* By person: pick the diner to settle */}
                        {splitTab === 'ITEMIZED' && (
                            <div role="group" aria-labelledby="diner-label" className="space-y-2">
                                <p id="diner-label" className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Select Diner to Settle:
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {dinerBreakdown.map((diner) => {
                                        const isSelected = selectedDinerName === diner.name;
                                        return (
                                            <button
                                                key={diner.name}
                                                type="button"
                                                onClick={() => setSelectedDinerName(diner.name)}
                                                aria-pressed={isSelected}
                                                className={`min-h-16 rounded-2xl border-2 p-3 text-left transition-colors active:scale-[0.98] ${
                                                    isSelected
                                                        ? 'border-brand bg-brand-subtle'
                                                        : 'border-border bg-card hover:border-foreground/25'
                                                }`}
                                            >
                                                <span className="flex items-center justify-between gap-2">
                                                    <span className="truncate text-sm font-semibold text-foreground">{diner.name}</span>
                                                    {diner.name === currentGuestName && (
                                                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground">
                                                            You
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="mt-1 block font-mono text-sm font-extrabold text-foreground tabular-nums">
                                                    ₹{diner.total}
                                                </span>
                                                <span className="block text-xs text-muted-foreground">
                                                    {diner.items.length} {diner.items.length === 1 ? 'dish' : 'dishes'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Tip */}
                        <div role="group" aria-labelledby="tip-label" className="space-y-2">
                            <p id="tip-label" className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                Add Tip for Staff (Optional)
                            </p>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { label: '₹0', val: 0 },
                                    { label: '₹20', val: 20 },
                                    { label: '₹50', val: 50 },
                                    { label: '10%', val: Math.round(payableDetails.subtotal * 0.1) },
                                ].map((t) => {
                                    const isSelected = selectedTip === t.val;
                                    return (
                                        <button
                                            key={t.label}
                                            type="button"
                                            onClick={() => setSelectedTip(t.val)}
                                            aria-pressed={isSelected}
                                            className={`min-h-11 rounded-xl border px-1 text-center font-mono text-sm font-bold tabular-nums transition-colors active:scale-95 ${
                                                isSelected
                                                    ? 'border-brand bg-brand text-brand-foreground shadow-xs'
                                                    : 'border-border bg-muted/40 text-foreground hover:bg-muted'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Payment method */}
                        <div role="group" aria-labelledby="method-label" className="space-y-2">
                            <p id="method-label" className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                Payment Method
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                {(
                                    [
                                        { method: 'UPI', label: 'UPI', note: 'Instant app', Icon: Smartphone, noteClass: 'text-emerald-700' },
                                        { method: 'CARD', label: 'Cards', note: 'Razorpay', Icon: CreditCard, noteClass: 'text-muted-foreground' },
                                        { method: 'CASH', label: 'Cash', note: 'Pay server', Icon: Banknote, noteClass: 'text-muted-foreground' },
                                    ] as { method: PaymentMethod; label: string; note: string; Icon: React.ElementType; noteClass: string }[]
                                ).map(({ method, label, note, Icon, noteClass }) => {
                                    const isSelected = selectedMethod === method;
                                    return (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setSelectedMethod(method)}
                                            aria-pressed={isSelected}
                                            className={`relative flex min-h-20 flex-col items-center justify-center rounded-2xl border-2 p-3 text-center transition-colors active:scale-95 ${
                                                isSelected
                                                    ? 'border-brand bg-brand-subtle shadow-xs'
                                                    : 'border-border bg-card hover:border-foreground/25'
                                            }`}
                                        >
                                            {isSelected && (
                                                <Check aria-hidden="true" className="absolute top-1.5 right-1.5 size-3.5 text-foreground" />
                                            )}
                                            <Icon aria-hidden="true" className="mb-1 size-5 text-foreground" />
                                            <span className="text-sm font-semibold text-foreground">{label}</span>
                                            <span className={`text-xs font-medium ${noteClass}`}>{note}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Amount summary */}
                        <dl className="space-y-2 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                                <dt>{payableDetails.label}</dt>
                                <dd className="font-mono font-medium text-foreground tabular-nums">₹{payableDetails.subtotal}</dd>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <dt>GST ({taxRate}%)</dt>
                                <dd className="font-mono font-medium text-foreground tabular-nums">₹{payableDetails.tax}</dd>
                            </div>
                            {selectedTip > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <dt>Staff Tip</dt>
                                    <dd className="font-mono font-medium text-foreground tabular-nums">₹{selectedTip}</dd>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-border pt-2.5 font-extrabold text-foreground">
                                <dt>Amount to Pay</dt>
                                <dd className="font-mono text-base font-extrabold tabular-nums">₹{payableDetails.total}</dd>
                            </div>
                        </dl>

                        {errorMessage && (
                            <div
                                role="alert"
                                className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-700"
                            >
                                <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Pay button */}
            {!paymentSuccess && (
                <div className="shrink-0 border-t border-border bg-card p-4 pb-safe shadow-lg">
                    <button
                        type="button"
                        onClick={handleExecutePayment}
                        disabled={isProcessing || payableDetails.total <= 0}
                        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-brand px-5 py-2.5 text-left text-brand-foreground shadow-lg transition-transform active:scale-[0.98] disabled:opacity-60"
                    >
                        <span>
                            <span className="block text-xs font-semibold tracking-wide uppercase opacity-80">
                                {selectedMethod === 'CASH' ? 'Confirm Cash Settlement' : `Pay via ${selectedMethod}`}
                            </span>
                            <span className="block text-base font-extrabold">
                                {selectedMethod === 'CASH' ? 'Ask Server for Bill' : 'Pay Now'}
                            </span>
                        </span>
                        <span className="flex items-center gap-1.5 font-mono text-base font-extrabold tabular-nums">
                            {isProcessing ? (
                                <span>Processing…</span>
                            ) : (
                                <>
                                    <span>₹{payableDetails.total}</span>
                                    <ArrowRight aria-hidden="true" className="size-4" />
                                </>
                            )}
                        </span>
                    </button>
                </div>
            )}

            {/* Post-Payment Review Modal (nested inside the bill sheet so focus and dismissal stay scoped) */}
            <PostPaymentReviewModal
                restaurant={restaurant}
                sessionId={sessionId}
                guestName={currentGuestName}
                isOpen={showReviewModal}
                onClose={() => {
                    setShowReviewModal(false);
                    onClose();
                }}
            />
        </BottomSheet>
    );
}
