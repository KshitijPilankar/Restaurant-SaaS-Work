'use client';

import React, { useTransition } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, AlertCircle, Utensils } from 'lucide-react';
import { CartItem, Restaurant, RestaurantTable, MenuItem } from '@/types/database';
import { updateCartItemQuantity, placeSharedOrder } from '@/app/r/[slug]/actions';

interface SharedCartDrawerProps {
    restaurant: Restaurant;
    table: RestaurantTable;
    sessionId: string;
    cartItems: CartItem[];
    menuItems: MenuItem[];
    currentGuestId: string;
    currentGuestName: string;
    isOpen: boolean;
    onClose: () => void;
    onOrderPlaced: (orderId: string) => void;
}

export function SharedCartDrawer({
    restaurant,
    table,
    sessionId,
    cartItems,
    menuItems,
    currentGuestId,
    currentGuestName,
    isOpen,
    onClose,
    onOrderPlaced,
}: SharedCartDrawerProps) {
    const [isUpdating, startUpdateTransition] = useTransition();
    const [isPlacing, startPlaceTransition] = useTransition();
    const [error, setError] = React.useState<string | null>(null);

    if (!isOpen) return null;

    // Subtotal & Tax Calculation
    const subtotal = cartItems.reduce(
        (sum, item) => sum + Number(item.unit_price) * item.quantity,
        0
    );
    const taxRate = Number(restaurant.tax_percentage) || 5.0;
    const taxAmount = Math.round((subtotal * taxRate) / 100);
    const grandTotal = subtotal + taxAmount;

    const handleQuantityChange = (cartItemId: string, newQty: number) => {
        startUpdateTransition(async () => {
            await updateCartItemQuantity(restaurant.id, sessionId, cartItemId, newQty);
        });
    };

    const handlePlaceOrder = () => {
        setError(null);
        startPlaceTransition(async () => {
            const res = await placeSharedOrder(
                restaurant.id,
                table.id,
                sessionId,
                currentGuestName || 'Table Guest'
            );

            if (res.success && res.data) {
                onOrderPlaced(res.data.orderId);
                onClose();
            } else {
                setError(res.error || 'Failed to place order. Please try again.');
            }
        });
    };

    // Find 2 upsell items not already in cart
    const inCartIds = new Set(cartItems.map((c) => c.menu_item_id));
    const upsellItems = menuItems
        .filter((m) => !inCartIds.has(m.id) && m.is_bestseller)
        .slice(0, 2);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 animate-fadeIn">
            <div className="w-full max-w-md bg-card rounded-t-[28px] max-h-[92vh] flex flex-col shadow-2xl animate-slideUp relative overflow-hidden border-t border-border">
                {/* Tactile Grab Handle */}
                <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

                {/* Header */}
                <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-xs ring-1 ring-black/5"
                            style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                            <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground text-base tracking-tight">Shared Table Cart</h3>
                            <p className="text-[11px] text-muted-foreground">
                                {table.display_name} • Synced live with all diners
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                        aria-label="Close cart drawer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {cartItems.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground space-y-2">
                            <Utensils className="w-10 h-10 mx-auto text-muted-foreground/60" />
                            <p className="text-sm font-semibold text-foreground">Your table cart is empty</p>
                            <p className="text-xs text-muted-foreground">Add dishes from the menu to start sharing.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cartItems.map((item) => {
                                const isAddedByMe = item.added_by_guest_id === currentGuestId;
                                const itemTotal = Number(item.unit_price) * item.quantity;
                                const dish = menuItems.find((m) => m.id === item.menu_item_id);
                                const dishName = dish?.name || 'Dish';

                                return (
                                    <div
                                        key={item.id}
                                        className="p-3.5 bg-muted/40 border border-border rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <h4 className="text-sm font-bold text-foreground truncate">
                                                    {dishName}
                                                </h4>
                                                {item.variant_name && (
                                                    <span className="text-[11px] font-semibold text-muted-foreground">
                                                        ({item.variant_name})
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                                <span className="font-mono font-bold text-foreground">
                                                    ₹{itemTotal}
                                                </span>
                                                <span>•</span>
                                                <span className="font-medium text-muted-foreground">
                                                    Added by <strong className="text-foreground">{isAddedByMe ? 'You' : item.added_by_name}</strong>
                                                </span>
                                            </div>

                                            {item.notes && (
                                                <p className="text-[11px] text-muted-foreground italic mt-1 truncate">
                                                    Note: {item.notes}
                                                </p>
                                            )}
                                        </div>

                                        {/* Stepper */}
                                        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-2xs shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                                disabled={isUpdating}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground hover:bg-muted transition cursor-pointer active:scale-90"
                                                aria-label="Decrease quantity"
                                            >
                                                {item.quantity === 1 ? (
                                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                ) : (
                                                    <Minus className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                            <span className="w-6 text-center text-xs font-bold text-foreground font-mono">
                                                {item.quantity}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                                disabled={isUpdating}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground hover:bg-muted transition cursor-pointer active:scale-90"
                                                aria-label="Increase quantity"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Contextual Upsells */}
                    {cartItems.length > 0 && upsellItems.length > 0 && (
                        <div className="pt-2">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                                Pairs well with your order:
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                {upsellItems.map((up) => (
                                    <div
                                        key={up.id}
                                        className="p-3 bg-muted/40 border border-border rounded-xl flex flex-col justify-between"
                                    >
                                        <div>
                                            <h5 className="text-xs font-bold text-foreground line-clamp-1">
                                                {up.name}
                                            </h5>
                                            <span className="text-xs font-extrabold text-foreground font-mono">
                                                ₹{up.base_price}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                startUpdateTransition(async () => {
                                                    await updateCartItemQuantity(restaurant.id, sessionId, up.id, 1);
                                                });
                                            }}
                                            className="mt-2 py-1.5 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-card border border-border text-foreground hover:bg-muted transition text-center cursor-pointer active:scale-95 shadow-2xs"
                                        >
                                            + Quick Add
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bill Breakdown */}
                    {cartItems.length > 0 && (
                        <div className="p-4 bg-muted/40 rounded-2xl border border-border space-y-2 text-xs">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Item Subtotal</span>
                                <span className="font-mono font-medium text-foreground">₹{subtotal}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Taxes & GST ({taxRate}%)</span>
                                <span className="font-mono font-medium text-foreground">₹{taxAmount}</span>
                            </div>
                            <div className="pt-2.5 border-t border-border flex justify-between font-bold text-sm text-foreground">
                                <span>Total Payable</span>
                                <span className="font-mono font-extrabold text-base">₹{grandTotal}</span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                {cartItems.length > 0 && (
                    <div className="p-4 pb-safe bg-card border-t border-border shrink-0 shadow-lg">
                        <button
                            type="button"
                            onClick={handlePlaceOrder}
                            disabled={isPlacing || cartItems.length === 0}
                            className="w-full py-4 px-5 rounded-2xl font-bold text-sm text-white shadow-lg active:scale-[0.98] transition flex items-center justify-between cursor-pointer disabled:opacity-50"
                            style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                            <div className="text-left">
                                <div className="text-[10px] uppercase font-bold text-white/80 tracking-wider">
                                    Send to Kitchen
                                </div>
                                <div className="text-sm font-extrabold">Place Table Order</div>
                            </div>
                            <div className="flex items-center gap-1.5 text-base font-extrabold font-mono">
                                <span>₹{grandTotal}</span>
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </button>
                        <p className="text-[10px] text-muted-foreground text-center mt-2">
                            Sends order to floor staff for verification before kitchen prep.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
