'use client';

import React, { useState, useMemo, useTransition } from 'react';
import {
    Receipt,
    Users,
    UserCheck,
    CreditCard,
    QrCode,
    Banknote,
    Plus,
    Minus,
    ArrowRight,
    Check,
    X,
    Sparkles,
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
                    <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-xs ring-1 ring-black/5"
                                style={{ backgroundColor: 'var(--brand-primary)' }}
                            >
                                <Receipt className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground text-base tracking-tight">Checkout & Bill</h3>
                                <p className="text-[11px] text-muted-foreground font-mono">
                                    {table.display_name} • Total Bill ₹{fullBillWithoutTip}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                            aria-label="Close bill drawer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content Scroll */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                        {paymentSuccess ? (
                            <div className="py-12 text-center space-y-3 animate-fadeIn">
                                <div
                                    className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl"
                                    style={{ backgroundColor: 'var(--brand-primary)' }}
                                >
                                    <Check className="w-8 h-8 stroke-[3]" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground tracking-tight">Payment Successful!</h3>
                                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                                    Paid ₹{payableDetails.total} via {selectedMethod}. Table status updated.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Split Bill Tabs */}
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                        Choose How to Pay
                                    </span>
                                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted rounded-2xl border border-border/60">
                                        <button
                                            type="button"
                                            onClick={() => setSplitTab('FULL')}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
                                                splitTab === 'FULL'
                                                    ? 'bg-card text-foreground shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Full Bill
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSplitTab('EQUAL')}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
                                                splitTab === 'EQUAL'
                                                    ? 'bg-card text-foreground shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            Split Equally
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSplitTab('ITEMIZED')}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
                                                splitTab === 'ITEMIZED'
                                                    ? 'bg-card text-foreground shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        >
                                            By Person
                                        </button>
                                    </div>
                                </div>

                                {/* Tab-Specific Controls */}
                                {splitTab === 'EQUAL' && (
                                    <div className="p-3.5 bg-muted/40 rounded-2xl border border-border flex items-center justify-between">
                                        <div>
                                            <div className="text-xs font-bold text-foreground">Split by Diners</div>
                                            <div className="text-[11px] text-muted-foreground font-mono">
                                                ₹{fullBillWithoutTip} ÷ {equalSplitCount} people
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1 shadow-2xs">
                                            <button
                                                type="button"
                                                onClick={() => setEqualSplitCount(Math.max(2, equalSplitCount - 1))}
                                                disabled={equalSplitCount <= 2}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 cursor-pointer active:scale-90"
                                                aria-label="Decrease split diners"
                                            >
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="w-6 text-center text-xs font-extrabold font-mono text-foreground">
                                                {equalSplitCount}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setEqualSplitCount(Math.min(10, equalSplitCount + 1))}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground hover:bg-muted cursor-pointer active:scale-90"
                                                aria-label="Increase split diners"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {splitTab === 'ITEMIZED' && (
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                            Select Diner to Settle:
                                        </span>
                                        <div className="grid grid-cols-2 gap-2">
                                            {dinerBreakdown.map((diner) => {
                                                const isSelected = selectedDinerName === diner.name;
                                                return (
                                                    <div
                                                        key={diner.name}
                                                        onClick={() => setSelectedDinerName(diner.name)}
                                                        className={`p-3 rounded-2xl border text-left cursor-pointer transition active:scale-[0.98] ${
                                                            isSelected
                                                                ? 'border-2 ring-2 ring-orange-500/10 bg-muted/60'
                                                                : 'border-border hover:border-foreground/20 bg-card'
                                                        }`}
                                                        style={{
                                                            borderColor: isSelected ? 'var(--brand-primary)' : undefined,
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-foreground truncate">
                                                                {diner.name}
                                                            </span>
                                                            {diner.name === currentGuestName && (
                                                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-muted text-foreground border border-border">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs font-extrabold text-foreground mt-1 font-mono">
                                                            ₹{diner.total}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                                            {diner.items.length} {diner.items.length === 1 ? 'dish' : 'dishes'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Tip Selection */}
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                        Add Tip for Staff (Optional)
                                    </span>
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
                                                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition cursor-pointer text-center active:scale-95 font-mono ${
                                                        isSelected
                                                            ? 'border-2 text-white shadow-xs'
                                                            : 'bg-muted/40 border-border text-foreground hover:bg-muted'
                                                    }`}
                                                    style={{
                                                        backgroundColor: isSelected ? 'var(--brand-primary)' : undefined,
                                                        borderColor: isSelected ? 'var(--brand-primary)' : undefined,
                                                    }}
                                                >
                                                    {t.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Payment Method Selector */}
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                        Payment Method
                                    </span>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMethod('UPI')}
                                            className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition cursor-pointer active:scale-95 ${
                                                selectedMethod === 'UPI'
                                                    ? 'border-2 bg-muted/60 shadow-xs'
                                                    : 'border-border hover:border-foreground/20 bg-card'
                                            }`}
                                            style={{
                                                borderColor: selectedMethod === 'UPI' ? 'var(--brand-primary)' : undefined,
                                            }}
                                        >
                                            <Smartphone className="w-5 h-5 mb-1 text-foreground" />
                                            <span className="text-xs font-bold text-foreground">UPI</span>
                                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Instant App</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setSelectedMethod('CARD')}
                                            className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition cursor-pointer active:scale-95 ${
                                                selectedMethod === 'CARD'
                                                    ? 'border-2 bg-muted/60 shadow-xs'
                                                    : 'border-border hover:border-foreground/20 bg-card'
                                            }`}
                                            style={{
                                                borderColor: selectedMethod === 'CARD' ? 'var(--brand-primary)' : undefined,
                                            }}
                                        >
                                            <CreditCard className="w-5 h-5 mb-1 text-foreground" />
                                            <span className="text-xs font-bold text-foreground">Cards</span>
                                            <span className="text-[9px] text-muted-foreground font-semibold">Razorpay</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setSelectedMethod('CASH')}
                                            className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition cursor-pointer active:scale-95 ${
                                                selectedMethod === 'CASH'
                                                    ? 'border-2 bg-muted/60 shadow-xs'
                                                    : 'border-border hover:border-foreground/20 bg-card'
                                            }`}
                                            style={{
                                                borderColor: selectedMethod === 'CASH' ? 'var(--brand-primary)' : undefined,
                                            }}
                                        >
                                            <Banknote className="w-5 h-5 mb-1 text-foreground" />
                                            <span className="text-xs font-bold text-foreground">Cash</span>
                                            <span className="text-[9px] text-muted-foreground font-semibold">Pay Server</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Bill Breakdown Summary */}
                                <div className="p-4 bg-muted/40 rounded-2xl border border-border space-y-2 text-xs">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>{payableDetails.label}</span>
                                        <span className="font-mono font-medium text-foreground">₹{payableDetails.subtotal}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>GST ({taxRate}%)</span>
                                        <span className="font-mono font-medium text-foreground">₹{payableDetails.tax}</span>
                                    </div>
                                    {selectedTip > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Staff Tip</span>
                                            <span className="font-mono font-medium text-foreground">₹{selectedTip}</span>
                                        </div>
                                    )}
                                    <div className="pt-2.5 border-t border-border flex justify-between font-extrabold text-sm text-foreground">
                                        <span>Amount to Pay</span>
                                        <span className="font-mono font-extrabold text-base">
                                            ₹{payableDetails.total}
                                        </span>
                                    </div>
                                </div>

                                {errorMessage && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Bottom Pay Button */}
                    {!paymentSuccess && (
                        <div className="p-4 pb-safe bg-card border-t border-border shrink-0 shadow-lg">
                            <button
                                type="button"
                                onClick={handleExecutePayment}
                                disabled={isProcessing || payableDetails.total <= 0}
                                className="w-full py-4 px-5 rounded-2xl font-bold text-sm text-white shadow-lg active:scale-[0.98] transition flex items-center justify-between cursor-pointer disabled:opacity-50"
                                style={{ backgroundColor: 'var(--brand-primary)' }}
                            >
                                <div className="text-left">
                                    <div className="text-[10px] uppercase font-bold text-white/80 tracking-wider">
                                        {selectedMethod === 'CASH' ? 'Confirm Cash Settlement' : `Pay via ${selectedMethod}`}
                                    </div>
                                    <div className="text-sm font-extrabold">
                                        {selectedMethod === 'CASH' ? 'Ask Server for Bill' : 'Pay Now'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-base font-extrabold font-mono">
                                    {isProcessing ? (
                                        <span>Processing...</span>
                                    ) : (
                                        <>
                                            <span>₹{payableDetails.total}</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </div>
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
