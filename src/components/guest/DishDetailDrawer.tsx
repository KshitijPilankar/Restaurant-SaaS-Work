'use client';

import React, { useState, useTransition } from 'react';
import { X, Plus, Minus, Flame, AlertCircle } from 'lucide-react';
import { MenuItem, DishVariant } from '@/types/database';
import { addToSharedCart } from '@/app/r/[slug]/actions';

interface DishDetailDrawerProps {
    dish: MenuItem | null;
    restaurantId: string;
    sessionId: string;
    guestId: string;
    guestName: string;
    isOpen: boolean;
    onClose: () => void;
    onItemAdded?: () => void;
}

export function DishDetailDrawer({
    dish,
    restaurantId,
    sessionId,
    guestId,
    guestName,
    isOpen,
    onClose,
    onItemAdded,
}: DishDetailDrawerProps) {
    const [selectedVariant, setSelectedVariant] = useState<DishVariant | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    // Reset when dish opens
    React.useEffect(() => {
        if (dish) {
            const defaultVar = (dish.variants && dish.variants.length > 0) ? dish.variants[0] : null;
            setSelectedVariant(defaultVar);
            setQuantity(1);
            setNotes('');
            setError(null);
        }
    }, [dish]);

    if (!isOpen || !dish) return null;

    const basePrice = Number(dish.base_price) || 0;
    const delta = selectedVariant ? Number(selectedVariant.price_delta) || 0 : 0;
    const unitPrice = basePrice + delta;
    const totalPrice = unitPrice * quantity;

    const handleAddToCart = () => {
        setError(null);

        startTransition(async () => {
            const res = await addToSharedCart({
                restaurantId,
                sessionId,
                menuItemId: dish.id,
                addedByGuestId: guestId,
                addedByName: guestName,
                variantName: selectedVariant?.name || null,
                unitPrice,
                quantity,
                notes: notes.trim() || null,
            });

            if (res.success) {
                onItemAdded?.();
                onClose();
            } else {
                setError(res.error || 'Failed to add item to table cart.');
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 animate-fadeIn">
            <div className="w-full max-w-md bg-card rounded-t-[28px] max-h-[92vh] flex flex-col shadow-2xl animate-slideUp relative overflow-hidden border-t border-border">
                {/* Tactile Grab Handle */}
                <div className="w-12 h-1.5 bg-white/70 rounded-full mx-auto mt-2.5 mb-1 absolute top-0 left-1/2 -translate-x-1/2 z-20 shrink-0 pointer-events-none drop-shadow" />

                {/* Close Button Floating */}
                <button
                    onClick={onClose}
                    className="absolute top-3.5 right-4 z-20 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/70 transition cursor-pointer"
                    aria-label="Close dish customization"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Dish Header Image */}
                <div className="relative w-full h-52 bg-muted shrink-0">
                    {dish.image_url ? (
                        <img
                            src={dish.image_url}
                            alt={dish.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 font-bold text-2xl">
                            {dish.name}
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

                    {/* Veg/Non-Veg Badge */}
                    <div className="absolute bottom-3 left-4 flex items-center gap-2">
                        <span
                            className={`w-4 h-4 rounded-xs border-2 flex items-center justify-center bg-card shadow-xs ${
                                dish.is_veg ? 'border-emerald-600' : 'border-rose-600'
                            }`}
                        >
                            <span
                                className={`w-2 h-2 rounded-full ${
                                    dish.is_veg ? 'bg-emerald-600' : 'bg-rose-600'
                                }`}
                            />
                        </span>
                        {dish.is_bestseller && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-amber-950 uppercase tracking-wider shadow-sm">
                                Bestseller
                            </span>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-5 flex-1 overflow-y-auto space-y-4">
                    <div>
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="text-lg font-bold text-foreground tracking-tight">{dish.name}</h3>
                            <span className="text-lg font-extrabold text-foreground font-mono">
                                ₹{unitPrice}
                            </span>
                        </div>
                        {dish.description && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {dish.description}
                            </p>
                        )}
                    </div>

                    {/* Spice & Allergen Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {dish.spice && dish.spice !== 'NONE' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60">
                                <Flame className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                                <span className="capitalize">{dish.spice.toLowerCase()} Spice</span>
                            </span>
                        )}
                        {dish.allergens && dish.allergens.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
                                Allergens: {dish.allergens.join(', ')}
                            </span>
                        )}
                        {dish.prep_time_mins && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
                                ~{dish.prep_time_mins} mins
                            </span>
                        )}
                    </div>

                    {/* Variants Options */}
                    {dish.variants && dish.variants.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/70">
                            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                                Select Portion / Variant *
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {dish.variants.map((v) => {
                                    const isSelected = selectedVariant?.name === v.name;
                                    const varPrice = basePrice + Number(v.price_delta);

                                    return (
                                        <button
                                            key={v.name}
                                            type="button"
                                            onClick={() => setSelectedVariant(v)}
                                            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between active:scale-[0.98] ${
                                                isSelected
                                                    ? 'border-2 ring-2 ring-orange-500/10 bg-muted/70 font-bold'
                                                    : 'border-border hover:border-foreground/20 bg-card'
                                            }`}
                                            style={{
                                                borderColor: isSelected ? 'var(--brand-primary)' : undefined,
                                            }}
                                        >
                                            <span className="text-xs font-semibold text-foreground">{v.name}</span>
                                            <span className="text-xs font-extrabold text-foreground font-mono mt-1">₹{varPrice}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Special Instructions Note */}
                    <div className="space-y-1.5 pt-2 border-t border-border/70">
                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                            Special Instructions (Optional)
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Less spicy, dressing on the side..."
                            maxLength={100}
                            className="w-full px-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-orange-500/20 transition"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Bottom Sticky Action Bar */}
                <div className="p-4 pb-safe bg-card border-t border-border flex items-center gap-3 shrink-0 shadow-lg">
                    {/* Stepper */}
                    <div className="flex items-center gap-1.5 bg-muted border border-border rounded-xl p-1 shadow-2xs">
                        <button
                            type="button"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            disabled={quantity <= 1}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-foreground hover:bg-card transition disabled:opacity-30 cursor-pointer active:scale-90"
                            aria-label="Decrease quantity"
                        >
                            <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-extrabold text-foreground font-mono">
                            {quantity}
                        </span>
                        <button
                            type="button"
                            onClick={() => setQuantity(quantity + 1)}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-foreground hover:bg-card transition cursor-pointer active:scale-90"
                            aria-label="Increase quantity"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Submit CTA */}
                    <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={isPending}
                        className="flex-1 py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-md active:scale-[0.98] transition flex items-center justify-between cursor-pointer disabled:opacity-50"
                        style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                        <span>Add to Table Cart</span>
                        <span className="font-mono">₹{totalPrice}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
