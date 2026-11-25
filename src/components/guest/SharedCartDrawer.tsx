'use client';

import React, { useTransition } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, AlertCircle, Utensils } from 'lucide-react';
import { CartItem, Restaurant, RestaurantTable, MenuItem } from '@/types/database';
import { addToSharedCart, updateCartItemQuantity, placeSharedOrder } from '@/app/r/[slug]/actions';
import { BottomSheet } from '@/components/ui/bottom-sheet';

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

    // Quick Add puts one of a suggested dish into the shared cart. It uses the same add action as
    // the dish drawer (a menu item id is not a cart row id), with the dish's default portion.
    const handleQuickAdd = (dish: MenuItem) => {
        setError(null);
        startUpdateTransition(async () => {
            const res = await addToSharedCart({
                restaurantId: restaurant.id,
                sessionId,
                menuItemId: dish.id,
                addedByGuestId: currentGuestId,
                addedByName: currentGuestName,
                variantName: dish.variants && dish.variants.length > 0 ? dish.variants[0].name : null,
                quantity: 1,
            });
            if (!res.success) {
                setError(res.error || 'Could not add that dish. Please try again.');
            }
        });
    };

    // Find 2 upsell items not already in cart
    const inCartIds = new Set(cartItems.map((c) => c.menu_item_id));
    const upsellItems = menuItems
        .filter((m) => !inCartIds.has(m.id) && m.is_bestseller)
        .slice(0, 2);

    return (
        <BottomSheet open={isOpen} onClose={onClose} label="Shared table cart" className="max-w-md max-h-[92vh]">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border py-2 pr-3 pl-5">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground ring-1 ring-black/5">
                        <ShoppingBag aria-hidden="true" className="size-[18px]" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="font-display text-lg leading-tight font-semibold tracking-tight text-foreground">
                            Shared Table Cart
                        </h2>
                        <p className="truncate text-xs text-muted-foreground">
                            {table.display_name} • Synced live with all diners
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Close cart drawer"
                >
                    <X aria-hidden="true" className="size-5" />
                </button>
            </div>

            {/* Items */}
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {cartItems.length === 0 ? (
                    <div className="space-y-2 py-16 text-center">
                        <Utensils aria-hidden="true" className="mx-auto size-10 text-muted-foreground/60" />
                        <p className="text-sm font-semibold text-foreground">Your table cart is empty</p>
                        <p className="text-xs text-muted-foreground">Add dishes from the menu to start sharing.</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {cartItems.map((item) => {
                            const isAddedByMe = item.added_by_guest_id === currentGuestId;
                            const itemTotal = Number(item.unit_price) * item.quantity;
                            const dish = menuItems.find((m) => m.id === item.menu_item_id);
                            const dishName = dish?.name || 'Dish';

                            return (
                                <li
                                    key={item.id}
                                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-2xs"
                                >
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <h3 className="text-[15px] leading-snug font-semibold text-foreground">
                                            {dishName}
                                            {item.variant_name && (
                                                <span className="ml-1 text-xs font-medium text-muted-foreground">
                                                    ({item.variant_name})
                                                </span>
                                            )}
                                        </h3>

                                        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                                            <span className="font-mono font-bold text-foreground tabular-nums">₹{itemTotal}</span>
                                            <span aria-hidden="true">·</span>
                                            <span>
                                                Added by{' '}
                                                <strong className="font-semibold text-foreground">
                                                    {isAddedByMe ? 'You' : item.added_by_name}
                                                </strong>
                                            </span>
                                        </p>

                                        {item.notes && (
                                            <p className="line-clamp-2 text-xs text-muted-foreground italic">Note: {item.notes}</p>
                                        )}
                                    </div>

                                    {/* Quantity stepper */}
                                    <div className="flex shrink-0 items-center rounded-xl border border-border bg-muted/50 p-0.5">
                                        <button
                                            type="button"
                                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                            disabled={isUpdating}
                                            className="flex size-11 items-center justify-center rounded-lg text-foreground transition hover:bg-card active:scale-90 disabled:opacity-50"
                                            aria-label={
                                                item.quantity === 1 ? `Remove ${dishName} from cart` : `Decrease ${dishName} quantity`
                                            }
                                        >
                                            {item.quantity === 1 ? (
                                                <Trash2 aria-hidden="true" className="size-4 text-red-700" />
                                            ) : (
                                                <Minus aria-hidden="true" className="size-4" />
                                            )}
                                        </button>
                                        <span className="w-7 text-center font-mono text-sm font-bold text-foreground tabular-nums">
                                            {item.quantity}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                            disabled={isUpdating}
                                            className="flex size-11 items-center justify-center rounded-lg text-foreground transition hover:bg-card active:scale-90 disabled:opacity-50"
                                            aria-label={`Increase ${dishName} quantity`}
                                        >
                                            <Plus aria-hidden="true" className="size-4" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* Contextual upsells */}
                {cartItems.length > 0 && upsellItems.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Pairs Well With Your Order
                        </p>
                        <ul className="grid grid-cols-2 gap-2">
                            {upsellItems.map((up) => (
                                <li
                                    key={up.id}
                                    className="flex flex-col justify-between gap-2 rounded-xl border border-border bg-muted/40 p-3"
                                >
                                    <div>
                                        <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{up.name}</h3>
                                        <span className="font-mono text-sm font-bold text-foreground tabular-nums">
                                            ₹{up.base_price}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleQuickAdd(up)}
                                        disabled={isUpdating}
                                        aria-label={`Quick add ${up.name}`}
                                        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-border bg-card px-2.5 text-sm font-semibold text-foreground shadow-2xs transition hover:bg-muted active:scale-95 disabled:opacity-50"
                                    >
                                        <Plus aria-hidden="true" className="size-3.5" />
                                        <span>Quick Add</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Bill breakdown */}
                {cartItems.length > 0 && (
                    <dl className="space-y-2 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                            <dt>Item Subtotal</dt>
                            <dd className="font-mono font-medium text-foreground tabular-nums">₹{subtotal}</dd>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <dt>Taxes &amp; GST ({taxRate}%)</dt>
                            <dd className="font-mono font-medium text-foreground tabular-nums">₹{taxAmount}</dd>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2.5 font-bold text-foreground">
                            <dt>Total Payable</dt>
                            <dd className="font-mono text-base font-extrabold tabular-nums">₹{grandTotal}</dd>
                        </div>
                    </dl>
                )}

                {error && (
                    <div
                        role="alert"
                        className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-700"
                    >
                        <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Footer action */}
            {cartItems.length > 0 && (
                <div className="shrink-0 border-t border-border bg-card p-4 pb-safe shadow-lg">
                    <button
                        type="button"
                        onClick={handlePlaceOrder}
                        disabled={isPlacing || cartItems.length === 0}
                        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-brand px-5 py-2.5 text-left text-brand-foreground shadow-lg transition-transform active:scale-[0.98] disabled:opacity-60"
                    >
                        <span>
                            <span className="block text-xs font-semibold tracking-wide uppercase opacity-80">
                                Send to Kitchen
                            </span>
                            <span className="block text-base font-extrabold">
                                {isPlacing ? 'Placing Order…' : 'Place Table Order'}
                            </span>
                        </span>
                        <span className="flex items-center gap-1.5 font-mono text-base font-extrabold tabular-nums">
                            <span>₹{grandTotal}</span>
                            <ArrowRight aria-hidden="true" className="size-4" />
                        </span>
                    </button>
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                        Floor staff verify your order before the kitchen starts.
                    </p>
                </div>
            )}
        </BottomSheet>
    );
}
