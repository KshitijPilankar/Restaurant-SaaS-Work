'use client';

import React, { useState, useMemo } from 'react';
import { Search, Flame, Plus, Sparkles, Check, Leaf, Star, X } from 'lucide-react';
import { MenuCategory, MenuItem, CartItem, SpiceLevel } from '@/types/database';

interface MenuExplorerProps {
    categories: MenuCategory[];
    menuItems: MenuItem[];
    cartItems: CartItem[];
    currentGuestId: string | null;
    currentGuestName: string | null;
    onSelectDish: (dish: MenuItem) => void;
}

const SPICE_LABEL: Record<Exclude<SpiceLevel, 'NONE'>, string> = {
    MILD: 'Mild',
    MEDIUM: 'Medium',
    SPICY: 'Spicy',
};

/** Standard Indian food-labelling mark: square outline with a dot (green = veg, red = non-veg). */
function DietMark({ isVeg }: { isVeg: boolean }) {
    return (
        <span
            role="img"
            aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
            className={`flex size-4 shrink-0 items-center justify-center rounded-[3px] border-2 bg-card ${
                isVeg ? 'border-emerald-700' : 'border-red-700'
            }`}
        >
            <span className={`size-2 rounded-full ${isVeg ? 'bg-emerald-700' : 'bg-red-700'}`} />
        </span>
    );
}

export function MenuExplorer({
    categories,
    menuItems,
    cartItems,
    onSelectDish,
}: MenuExplorerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isVegOnly, setIsVegOnly] = useState(false);
    const [activeCategoryId, setActiveCategoryId] = useState<string>('ALL');

    // Cart quantity per menu item, to show "2 added" on a dish card
    const cartCountMap = useMemo(() => {
        const map = new Map<string, number>();
        for (const item of cartItems) {
            map.set(item.menu_item_id, (map.get(item.menu_item_id) || 0) + item.quantity);
        }
        return map;
    }, [cartItems]);

    // Categories with their items after the search and veg filters
    const filteredCategories = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return categories
            .map((cat) => ({
                ...cat,
                items: menuItems.filter((item) => {
                    if (item.category_id !== cat.id) return false;
                    if (isVegOnly && !item.is_veg) return false;
                    if (q) {
                        return (
                            item.name.toLowerCase().includes(q) ||
                            !!item.description?.toLowerCase().includes(q)
                        );
                    }
                    return true;
                }),
            }))
            .filter((cat) => cat.items.length > 0);
    }, [categories, menuItems, isVegOnly, searchQuery]);

    const displayedCategories = useMemo(() => {
        if (activeCategoryId === 'ALL') return filteredCategories;
        return filteredCategories.filter((c) => c.id === activeCategoryId);
    }, [filteredCategories, activeCategoryId]);

    const pillBase =
        'inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors active:scale-95';
    const pillOn = 'bg-brand text-brand-foreground shadow-xs';
    const pillOff = 'border border-border bg-card text-foreground hover:bg-muted';

    return (
        <div className="space-y-4">
            {/* Search and Pure Veg filter */}
            <div className="flex items-center gap-2 px-4">
                <div className="relative flex-1">
                    <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                        type="text"
                        name="menu-search"
                        inputMode="search"
                        enterKeyHint="search"
                        autoComplete="off"
                        spellCheck={false}
                        aria-label="Search the menu"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search the menu…"
                        className="h-11 w-full rounded-2xl border border-border bg-card pr-11 pl-10 text-base text-foreground shadow-2xs outline-none transition placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            aria-label="Clear search"
                            className="absolute top-0 right-0 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                        >
                            <X aria-hidden="true" className="size-4" />
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setIsVegOnly(!isVegOnly)}
                    aria-pressed={isVegOnly}
                    className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-2xl border px-3.5 text-sm font-semibold shadow-2xs transition-colors active:scale-95 ${
                        isVegOnly
                            ? 'border-emerald-700 bg-emerald-700 text-white'
                            : 'border-border bg-card text-foreground hover:bg-muted'
                    }`}
                >
                    <Leaf aria-hidden="true" className="size-4" />
                    <span>Pure Veg</span>
                </button>
            </div>

            {/* Sticky category bar */}
            <nav
                aria-label="Menu categories"
                className="scrollbar-none sticky top-[var(--guest-header-h)] z-20 flex items-center gap-2 overflow-x-auto border-y border-border/80 bg-background/95 px-4 py-1.5 backdrop-blur-md"
            >
                <button
                    type="button"
                    onClick={() => setActiveCategoryId('ALL')}
                    aria-pressed={activeCategoryId === 'ALL'}
                    className={`${pillBase} ${activeCategoryId === 'ALL' ? pillOn : pillOff}`}
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
                            aria-pressed={isActive}
                            className={`${pillBase} ${isActive ? pillOn : pillOff}`}
                        >
                            {cat.name}
                        </button>
                    );
                })}
            </nav>

            {/* Dishes grouped by category */}
            <div className="space-y-8 px-4">
                {displayedCategories.length === 0 ? (
                    <div className="space-y-2 rounded-3xl border border-dashed border-border bg-card p-8 py-16 text-center">
                        <Sparkles aria-hidden="true" className="mx-auto size-8 text-muted-foreground/60" />
                        <p className="text-sm font-semibold text-foreground">No dishes match your filters</p>
                        <p className="text-xs text-muted-foreground">
                            Clear the search or turn off Pure Veg to see the full menu.
                        </p>
                    </div>
                ) : (
                    displayedCategories.map((cat) => (
                        <section key={cat.id} aria-labelledby={`cat-${cat.id}`} className="space-y-3">
                            <div className="flex items-baseline justify-between gap-3">
                                <h2
                                    id={`cat-${cat.id}`}
                                    className="font-display text-xl font-semibold tracking-tight text-balance text-foreground"
                                >
                                    {cat.name}
                                </h2>
                                <span className="text-xs font-medium text-muted-foreground">
                                    {cat.items.length} {cat.items.length === 1 ? 'dish' : 'dishes'}
                                </span>
                            </div>

                            <ul className="grid grid-cols-1 gap-3">
                                {cat.items.map((dish) => {
                                    const totalInCart = cartCountMap.get(dish.id) || 0;
                                    const spice = dish.spice && dish.spice !== 'NONE' ? dish.spice : null;

                                    return (
                                        <li
                                            key={dish.id}
                                            className="relative flex items-start gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-colors hover:border-foreground/20"
                                        >
                                            {/* Details */}
                                            <div className="min-w-0 flex-1 space-y-1.5">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <DietMark isVeg={dish.is_veg} />
                                                    {dish.is_bestseller && (
                                                        <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                                                            <Star aria-hidden="true" className="size-3 fill-current" />
                                                            Bestseller
                                                        </span>
                                                    )}
                                                    {spice && (
                                                        <span className="inline-flex items-center gap-1 font-medium text-red-700">
                                                            <Flame aria-hidden="true" className="size-3.5" />
                                                            {SPICE_LABEL[spice]}
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="font-display text-[17px] leading-snug font-semibold text-balance text-foreground">
                                                    {/* The name button stretches over the whole card, so the card is one big tap target */}
                                                    <button
                                                        type="button"
                                                        onClick={() => onSelectDish(dish)}
                                                        className="text-left outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
                                                    >
                                                        {dish.name}
                                                    </button>
                                                </h3>

                                                <p className="font-mono text-[15px] font-bold text-foreground tabular-nums">
                                                    ₹{dish.base_price}
                                                </p>

                                                {dish.description && (
                                                    <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                                                        {dish.description}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Photo with the Add control overlapping its lower edge */}
                                            <div className="flex w-24 shrink-0 flex-col items-center">
                                                <div className="size-24 overflow-hidden rounded-2xl border border-border/60 bg-muted">
                                                    {dish.image_url ? (
                                                        <img
                                                            src={dish.image_url}
                                                            alt=""
                                                            width={96}
                                                            height={96}
                                                            loading="lazy"
                                                            decoding="async"
                                                            className="size-full object-cover"
                                                        />
                                                    ) : (
                                                        <div
                                                            aria-hidden="true"
                                                            className="flex size-full items-center justify-center bg-brand-subtle font-display text-3xl font-semibold text-muted-foreground/70"
                                                        >
                                                            {dish.name.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => onSelectDish(dish)}
                                                    aria-label={
                                                        totalInCart > 0
                                                            ? `${dish.name}: ${totalInCart} in table cart. Add more`
                                                            : `Add ${dish.name} to table cart`
                                                    }
                                                    className={`relative z-10 -mt-5 inline-flex h-11 min-w-24 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold shadow-md ring-4 ring-card transition-transform active:scale-95 ${
                                                        totalInCart > 0
                                                            ? 'bg-brand text-brand-foreground'
                                                            : 'border-2 border-brand bg-card text-foreground'
                                                    }`}
                                                >
                                                    {totalInCart > 0 ? (
                                                        <>
                                                            <Check aria-hidden="true" className="size-4" />
                                                            <span className="font-mono tabular-nums">{totalInCart}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>Add</span>
                                                            <Plus aria-hidden="true" className="size-4" />
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))
                )}
            </div>
        </div>
    );
}
