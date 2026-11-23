'use client';

import React, { useState, useMemo } from 'react';
import { Search, Flame, Plus, Sparkles, Check, Leaf } from 'lucide-react';
import { MenuCategory, MenuItem, CartItem } from '@/types/database';

interface MenuExplorerProps {
    categories: MenuCategory[];
    menuItems: MenuItem[];
    cartItems: CartItem[];
    currentGuestId: string | null;
    currentGuestName: string | null;
    onSelectDish: (dish: MenuItem) => void;
}

export function MenuExplorer({
    categories,
    menuItems,
    cartItems,
    currentGuestId,
    currentGuestName,
    onSelectDish,
}: MenuExplorerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isVegOnly, setIsVegOnly] = useState(false);
    const [activeCategoryId, setActiveCategoryId] = useState<string>('ALL');

    // Build cart quantity map per menu_item_id
    const cartCountMap = useMemo(() => {
        const map = new Map<string, number>();
        for (const item of cartItems) {
            const current = map.get(item.menu_item_id) || 0;
            map.set(item.menu_item_id, current + item.quantity);
        }
        return map;
    }, [cartItems]);

    // Filter categories & items
    const filteredCategories = useMemo(() => {
        return categories.map((cat) => {
            const items = menuItems.filter((item) => {
                if (item.category_id !== cat.id) return false;
                if (isVegOnly && !item.is_veg) return false;
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const matchesName = item.name.toLowerCase().includes(q);
                    const matchesDesc = item.description?.toLowerCase().includes(q);
                    return matchesName || matchesDesc;
                }
                return true;
            });

            return {
                ...cat,
                items,
            };
        }).filter((cat) => cat.items.length > 0);
    }, [categories, menuItems, isVegOnly, searchQuery]);

    // Active category items if filtered
    const displayedCategories = useMemo(() => {
        if (activeCategoryId === 'ALL') return filteredCategories;
        return filteredCategories.filter((c) => c.id === activeCategoryId);
    }, [filteredCategories, activeCategoryId]);

    return (
        <div className="space-y-4">
            {/* Search & Pure Veg Filter Row */}
            <div className="px-4 space-y-2.5">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search appetizing dishes, drinks..."
                            className="w-full pl-10 pr-12 py-2.5 bg-card border border-border rounded-2xl text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/20 shadow-2xs font-medium transition"
                            style={{ outlineColor: 'var(--brand-primary)' }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Veg Only Toggle Button */}
                    <button
                        type="button"
                        onClick={() => setIsVegOnly(!isVegOnly)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold border transition cursor-pointer shrink-0 shadow-2xs active:scale-95 ${
                            isVegOnly
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-600/20'
                                : 'bg-card border-border text-foreground hover:bg-muted'
                        }`}
                    >
                        <Leaf className="w-3.5 h-3.5" />
                        <span>Pure Veg</span>
                    </button>
                </div>
            </div>

            {/* Sticky Horizontal Category Scroll Bar */}
            <div className="sticky top-[57px] z-20 bg-background/95 backdrop-blur-md border-y border-border/80 py-2.5 px-4 overflow-x-auto scrollbar-none flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setActiveCategoryId('ALL')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer active:scale-95 ${
                        activeCategoryId === 'ALL'
                            ? 'text-white shadow-xs'
                            : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                    style={{
                        backgroundColor: activeCategoryId === 'ALL' ? 'var(--brand-primary)' : undefined,
                    }}
                >
                    All Items
                </button>
                {filteredCategories.map((cat) => {
                    const isActive = activeCategoryId === cat.id;
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setActiveCategoryId(cat.id)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer active:scale-95 ${
                                isActive
                                    ? 'text-white shadow-xs'
                                    : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                            style={{
                                backgroundColor: isActive ? 'var(--brand-primary)' : undefined,
                            }}
                        >
                            {cat.name} ({cat.items.length})
                        </button>
                    );
                })}
            </div>

            {/* Menu Items List Grouped by Category */}
            <div className="px-4 space-y-6">
                {displayedCategories.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground space-y-2 bg-card rounded-3xl border border-dashed border-border p-8">
                        <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/60" />
                        <p className="text-sm font-semibold text-foreground">No dishes match your filter</p>
                        <p className="text-xs text-muted-foreground">Try clearing search keywords or the Pure Veg filter.</p>
                    </div>
                ) : (
                    displayedCategories.map((cat) => (
                        <section key={cat.id} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-extrabold text-foreground tracking-tight">
                                    {cat.name}
                                </h2>
                                <span className="text-xs font-medium text-muted-foreground">
                                    {cat.items.length} {cat.items.length === 1 ? 'dish' : 'dishes'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {cat.items.map((dish) => {
                                    const totalInCart = cartCountMap.get(dish.id) || 0;
                                    const hasVariants = dish.variants && dish.variants.length > 0;

                                    return (
                                        <div
                                            key={dish.id}
                                            onClick={() => onSelectDish(dish)}
                                            className="bg-card rounded-2xl p-3.5 sm:p-4 border border-border/80 hover:border-foreground/20 transition-all shadow-xs flex items-start gap-3.5 cursor-pointer active:scale-[0.99]"
                                        >
                                            {/* Left Details */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-between h-full space-y-1.5">
                                                <div>
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        {/* Veg/Non-Veg Dot */}
                                                        <span
                                                            className={`w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center shrink-0 bg-card ${
                                                                dish.is_veg ? 'border-emerald-600' : 'border-rose-600'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`w-1.5 h-1.5 rounded-full ${
                                                                    dish.is_veg ? 'bg-emerald-600' : 'bg-rose-600'
                                                                }`}
                                                            />
                                                        </span>

                                                        {dish.is_bestseller && (
                                                            <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-700/60 px-1.5 py-0.2 rounded-md uppercase tracking-wider">
                                                                Bestseller
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="text-sm font-bold text-foreground leading-snug">
                                                        {dish.name}
                                                    </h3>

                                                    <div className="text-sm font-extrabold text-foreground font-mono mt-0.5">
                                                        ₹{dish.base_price}
                                                    </div>

                                                    {dish.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                                                            {dish.description}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Badges: Spice & Variants */}
                                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                    {dish.spice && dish.spice !== 'NONE' && (
                                                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60">
                                                            <Flame className="w-2.5 h-2.5 text-orange-600 dark:text-orange-400" />
                                                            <span className="capitalize">{dish.spice.toLowerCase()}</span>
                                                        </span>
                                                    )}
                                                    {hasVariants && (
                                                        <span className="text-[10px] text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-md border border-border/60">
                                                            Customisable
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right: Dish Photo & Add CTA */}
                                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-muted shrink-0 overflow-hidden shadow-2xs border border-border/60">
                                                {dish.image_url ? (
                                                    <img
                                                        src={dish.image_url}
                                                        alt={dish.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 font-bold text-xs">
                                                        DineOS
                                                    </div>
                                                )}

                                                {/* Floating ADD Pill */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectDish(dish);
                                                    }}
                                                    className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider bg-card/95 backdrop-blur-xs shadow-md border border-border hover:border-foreground/30 transition active:scale-90 flex items-center gap-1 cursor-pointer"
                                                    style={{ color: totalInCart > 0 ? undefined : 'var(--brand-primary)' }}
                                                    aria-label={`Add ${dish.name} to table cart`}
                                                >
                                                    {totalInCart > 0 ? (
                                                        <>
                                                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-mono">{totalInCart} added</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>ADD</span>
                                                            <Plus className="w-3 h-3" />
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))
                )}
            </div>
        </div>
    );
}
