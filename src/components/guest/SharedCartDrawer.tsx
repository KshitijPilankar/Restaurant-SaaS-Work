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
            <div className="w-full max-w-md bg-white rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl animate-slideUp relative overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-xs"
                            style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                            <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-zinc-900 text-base">Shared Table Cart</h3>
                            <p className="text-[11px] text-zinc-400">
                                {table.display_name} • Synced live with all diners
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {cartItems.length === 0 ? (
                        <div className="py-16 text-center text-zinc-400 space-y-2">
                            <Utensils className="w-10 h-10 mx-auto text-zinc-300" />
                            <p className="text-sm font-semibold text-zinc-700">Your table cart is empty</p>
                            <p className="text-xs text-zinc-400">Add dishes from the menu to start sharing.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cartItems.map((item) => {
                                const isAddedByMe = item.added_by_guest_id === currentGuestId;
                                const itemTotal = Number(item.unit_price) * item.quantity;

                                return (
                                    <div
                                        key={item.id}
                                        className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-2xl flex items-center justify-between gap-3"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <h4 className="text-sm font-bold text-zinc-900 truncate">
                                                    {/* We can infer or render name from cart_items if joined or item_name */}
                                                    Item
                                                </h4>
                                                {item.variant_name && (
                                                    <span className="text-[11px] font-semibold text-zinc-500">
                                                        ({item.variant_name})
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                                                <span className="font-mono font-bold text-zinc-900">
                                                    ₹{itemTotal}
                                                </span>
                                                <span>•</span>
                                                <span className="italic">
                                                    Added by {isAddedByMe ? 'You' : item.added_by_name}
                                                </span>
                                            </div>

                                            {item.notes && (
                                                <p className="text-[11px] text-zinc-400 italic mt-1 truncate">
                                                    Note: {item.notes}
                                                </p>
                                            )}
                                        </div>

                                        {/* Stepper */}
                                        <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-xl p-1 shadow-2xs shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                                disabled={isUpdating}
                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 transition cursor-pointer"
                                            >
                                                {item.quantity === 1 ? (
                                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                ) : (
                                                    <Minus className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                            <span className="w-5 text-center text-xs font-bold text-zinc-900 font-mono">
                                                {item.quantity}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                                disabled={isUpdating}
                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:bg-zinc-100 transition cursor-pointer"
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
                            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                                Pairs well with your order:
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                {upsellItems.map((up) => (
                                    <div
                                        key={up.id}
                                        className="p-2.5 bg-zinc-50 border border-zinc-200/80 rounded-xl flex flex-col justify-between"
                                    >
                                        <div>
                                            <h5 className="text-xs font-bold text-zinc-900 line-clamp-1">
                                                {up.name}
                                            </h5>
                                            <span className="text-xs font-extrabold text-zinc-800">
                                                ₹{up.base_price}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // Trigger fast add for upsell
                                                startUpdateTransition(async () => {
                                                    await updateCartItemQuantity(restaurant.id, sessionId, up.id, 1);
                                                });
                                            }}
                                            className="mt-2 py-1 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-100 transition text-center cursor-pointer"
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
                        <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-1.5 text-xs">
                            <div className="flex justify-between text-zinc-500">
                                <span>Item Subtotal</span>
                                <span className="font-mono">₹{subtotal}</span>
                            </div>
                            <div className="flex justify-between text-zinc-500">
                                <span>Taxes & GST ({taxRate}%)</span>
                                <span className="font-mono">₹{taxAmount}</span>
                            </div>
                            <div className="pt-2 border-t border-zinc-200 flex justify-between font-bold text-sm text-zinc-900">
                                <span>Total Payable</span>
                                <span className="font-mono font-extrabold">₹{grandTotal}</span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                {cartItems.length > 0 && (
                    <div className="p-4 bg-white border-t border-zinc-100 shrink-0">
                        <button
                            type="button"
                            onClick={handlePlaceOrder}
                            disabled={isPlacing || cartItems.length === 0}
                            className="w-full py-4 px-4 rounded-2xl font-bold text-sm text-white shadow-lg active:scale-[0.99] transition flex items-center justify-between cursor-pointer disabled:opacity-50"
                            style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                            <div className="text-left">
                                <div className="text-[10px] uppercase font-semibold text-white/80">
                                    Send to Kitchen
                                </div>
                                <div className="text-sm font-bold">Place Table Order</div>
                            </div>
                            <div className="flex items-center gap-1.5 text-base font-extrabold font-mono">
                                <span>₹{grandTotal}</span>
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </button>
                        <p className="text-[10px] text-zinc-400 text-center mt-2">
                            Sends order to floor staff for verification before kitchen prep.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
