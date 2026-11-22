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
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search appetizing dishes, drinks..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200/90 rounded-2xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 shadow-2xs font-medium"
                            style={{ outlineColor: 'var(--brand-primary)' }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Veg Only Toggle Button */}
                    <button
                        type="button"
                        onClick={() => setIsVegOnly(!isVegOnly)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold border transition cursor-pointer shrink-0 shadow-2xs ${
                            isVegOnly
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-600/20'
                                : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        }`}
                    >
                        <Leaf className="w-3.5 h-3.5" />
                        <span>Pure Veg</span>
                    </button>
                </div>
            </div>

            {/* Sticky Horizontal Category Scroll Bar */}
            <div className="sticky top-[53px] z-20 bg-white/95 backdrop-blur-md border-y border-zinc-100 py-2.5 px-4 overflow-x-auto scrollbar-none flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setActiveCategoryId('ALL')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        activeCategoryId === 'ALL'
                            ? 'text-white shadow-sm'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
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
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                                isActive
                                    ? 'text-white shadow-sm'
                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
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
                    <div className="py-16 text-center text-zinc-400 space-y-2">
                        <Sparkles className="w-8 h-8 mx-auto text-zinc-300" />
                        <p className="text-sm font-semibold text-zinc-700">No dishes match your filter</p>
                        <p className="text-xs text-zinc-400">Try clearing search or the veg toggle.</p>
                    </div>
                ) : (
                    displayedCategories.map((cat) => (
                        <section key={cat.id} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-extrabold text-zinc-900 tracking-tight">
                                    {cat.name}
                                </h2>
                                <span className="text-xs font-medium text-zinc-400">
                                    {cat.items.length} dishes
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
                                            className="bg-white rounded-2xl p-3.5 border border-zinc-200/80 hover:border-zinc-300 transition shadow-2xs flex items-start gap-3 cursor-pointer active:scale-[0.99]"
                                        >
                                            {/* Left Details */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-between h-full space-y-1.5">
                                                <div>
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        {/* Veg/Non-Veg Dot */}
                                                        <span
                                                            className={`w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center shrink-0 ${
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
                                                            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded uppercase tracking-wider">
                                                                Bestseller
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="text-sm font-bold text-zinc-900 leading-snug">
                                                        {dish.name}
                                                    </h3>

                                                    <div className="text-sm font-extrabold text-zinc-900 mt-0.5">
                                                        ₹{dish.base_price}
                                                    </div>

                                                    {dish.description && (
                                                        <p className="text-xs text-zinc-500 line-clamp-2 mt-1 leading-relaxed">
                                                            {dish.description}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Badges: Spice & Variants */}
                                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                    {dish.spice && dish.spice !== 'NONE' && (
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-orange-700">
                                                            <Flame className="w-2.5 h-2.5" />
                                                            <span className="capitalize">{dish.spice.toLowerCase()}</span>
                                                        </span>
                                                    )}
                                                    {hasVariants && (
                                                        <span className="text-[10px] text-zinc-400 font-medium">
                                                            Customisable
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right: Dish Photo & Add CTA */}
                                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-zinc-100 shrink-0 overflow-hidden shadow-2xs">
                                                {dish.image_url ? (
                                                    <img
                                                        src={dish.image_url}
                                                        alt={dish.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-zinc-300 font-bold text-xs">
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
                                                    className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-white shadow-md border border-zinc-200 transition active:scale-90 flex items-center gap-1 cursor-pointer"
                                                    style={{ color: 'var(--brand-primary)' }}
                                                >
                                                    {totalInCart > 0 ? (
                                                        <>
                                                            <Check className="w-3 h-3 text-emerald-600" />
                                                            <span>{totalInCart} in Cart</span>
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
