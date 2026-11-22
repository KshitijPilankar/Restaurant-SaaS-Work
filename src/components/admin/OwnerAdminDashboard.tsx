'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
    LayoutDashboard,
    UtensilsCrossed,
    QrCode,
    Settings,
    LogOut,
    ExternalLink,
    Copy,
    Check,
    Search,
    Plus,
    Trash2,
    DollarSign,
    TrendingUp,
    Receipt,
    ShoppingBag,
    Star,
    AlertCircle,
    CheckCircle2,
    Printer,
    Edit2,
    Wifi,
    Smartphone,
    Globe,
    Layers,
    ChefHat,
    MessageSquare,
    Eye,
    EyeOff,
} from 'lucide-react';
import {
    Restaurant,
    RestaurantTable,
    MenuCategory,
    MenuItem,
    KitchenStation,
    Payment,
    Order,
    Review,
    SpiceLevel,
} from '@/types/database';
import {
    toggleMenuItemAvailability,
    updateMenuItemPrice,
    createMenuItem,
    deleteMenuItem,
    updateRestaurantSettings,
    logoutOwner,
    CreateMenuItemInput,
    UpdateRestaurantSettingsInput,
} from '@/app/admin/[slug]/actions';

interface OwnerAdminDashboardProps {
    restaurant: Restaurant;
    tables: RestaurantTable[];
    categories: MenuCategory[];
    stations: KitchenStation[];
    menuItems: MenuItem[];
    payments: Payment[];
    orders: Order[];
    reviews: Review[];
    adminName: string;
}

type TabType = 'overview' | 'menu' | 'qrs' | 'settings';

export function OwnerAdminDashboard({
    restaurant,
    tables,
    categories,
    stations,
    menuItems: initialMenuItems,
    payments,
    orders,
    reviews,
    adminName,
}: OwnerAdminDashboardProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
    const [isPending, startTransition] = useTransition();
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Copied feedback helper
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedUrl(id);
        setTimeout(() => setCopiedUrl(null), 2000);
    };

    // -------------------------------------------------------------------------
    // METRICS / KPI CALCULATIONS
    // -------------------------------------------------------------------------
    const today = new Date().toISOString().split('T')[0];
    const todayPaidPayments = useMemo(() => {
        return payments.filter(
            (p) => p.status === 'PAID' && p.created_at.startsWith(today)
        );
    }, [payments, today]);

    const todayRevenue = useMemo(() => {
        return todayPaidPayments.reduce((sum, p) => sum + Number(p.total_amount), 0);
    }, [todayPaidPayments]);

    const allPaidPayments = useMemo(() => {
        return payments.filter((p) => p.status === 'PAID');
    }, [payments]);

    const totalRevenueAllTime = useMemo(() => {
        return allPaidPayments.reduce((sum, p) => sum + Number(p.total_amount), 0);
    }, [allPaidPayments]);

    const validOrdersCount = useMemo(() => {
        return orders.filter((o) => o.status !== 'CANCELLED').length;
    }, [orders]);

    const averageRating = useMemo(() => {
        if (!reviews.length) return null;
        const total = reviews.reduce((sum, r) => sum + r.rating, 0);
        return (total / reviews.length).toFixed(1);
    }, [reviews]);

    const privateFeedbackCount = useMemo(() => {
        return reviews.filter((r) => r.rating <= 3).length;
    }, [reviews]);

    // -------------------------------------------------------------------------
    // MENU FILTER & EDIT STATES
    // -------------------------------------------------------------------------
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
    const [vegOnlyFilter, setVegOnlyFilter] = useState(false);

    // Inline price editing
    const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
    const [tempPrice, setTempPrice] = useState<string>('');

    // Add Dish Modal
    const [isAddDishModalOpen, setIsAddDishModalOpen] = useState(false);
    const [newDishName, setNewDishName] = useState('');
    const [newDishDesc, setNewDishDesc] = useState('');
    const [newDishPrice, setNewDishPrice] = useState('');
    const [newDishCategory, setNewDishCategory] = useState(categories[0]?.id || '');
    const [newDishStation, setNewDishStation] = useState(stations[0]?.id || '');
    const [newDishIsVeg, setNewDishIsVeg] = useState(true);
    const [newDishSpice, setNewDishSpice] = useState<SpiceLevel>('NONE');
    const [newDishAllergens, setNewDishAllergens] = useState('');
    const [newDishImageUrl, setNewDishImageUrl] = useState('');

    // -------------------------------------------------------------------------
    // SETTINGS FORM STATE
    // -------------------------------------------------------------------------
    const [settingsForm, setSettingsForm] = useState<UpdateRestaurantSettingsInput>({
        name: restaurant.name,
        primaryColor: restaurant.primary_color || '#EA580C',
        taxPercentage: Number(restaurant.tax_percentage) || 5.0,
        wifiSsid: restaurant.wifi_ssid || '',
        wifiPassword: restaurant.wifi_password || '',
        upiId: restaurant.upi_id || '',
        googleReviewUrl: restaurant.google_review_url || '',
        logoUrl: restaurant.logo_url || '',
        coverImageUrl: restaurant.cover_image_url || '',
    });

    // -------------------------------------------------------------------------
    // HANDLERS
    // -------------------------------------------------------------------------
    const showNotice = (type: 'success' | 'error', text: string) => {
        setActionMessage({ type, text });
        setTimeout(() => setActionMessage(null), 4000);
    };

    // Toggle In Stock
    const handleToggleStock = (item: MenuItem) => {
        const nextState = !item.is_available;
        // Optimistic update
        setMenuItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, is_available: nextState } : i))
        );

        startTransition(async () => {
            const res = await toggleMenuItemAvailability(
                restaurant.slug,
                restaurant.id,
                item.id,
                nextState
            );
            if (!res.success) {
                // Revert
                setMenuItems((prev) =>
                    prev.map((i) => (i.id === item.id ? { ...i, is_available: !nextState } : i))
                );
                showNotice('error', res.error || 'Failed to update item availability.');
            } else {
                showNotice('success', `${item.name} marked ${nextState ? 'In Stock' : 'Sold Out'}.`);
            }
        });
    };

    // Save Price
    const handleSavePrice = (item: MenuItem) => {
        const num = parseFloat(tempPrice);
        if (isNaN(num) || num < 0) {
            showNotice('error', 'Please enter a valid price.');
            return;
        }

        const oldPrice = item.base_price;
        setMenuItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, base_price: num } : i))
        );
        setEditingPriceId(null);

        startTransition(async () => {
            const res = await updateMenuItemPrice(
                restaurant.slug,
                restaurant.id,
                item.id,
                num
            );
            if (!res.success) {
                setMenuItems((prev) =>
                    prev.map((i) => (i.id === item.id ? { ...i, base_price: oldPrice } : i))
                );
                showNotice('error', res.error || 'Failed to update price.');
            } else {
                showNotice('success', `Price updated to ₹${num} for ${item.name}.`);
            }
        });
    };

    // Add Dish
    const handleCreateDish = (e: React.FormEvent) => {
        e.preventDefault();
        const priceNum = parseFloat(newDishPrice);
        if (isNaN(priceNum) || priceNum < 0) {
            showNotice('error', 'Please enter a valid base price.');
            return;
        }

        const allergensList = newDishAllergens
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

        const input: CreateMenuItemInput = {
            name: newDishName,
            description: newDishDesc,
            basePrice: priceNum,
            categoryId: newDishCategory,
            stationId: newDishStation || null,
            isVeg: newDishIsVeg,
            spice: newDishSpice,
            allergens: allergensList,
            imageUrl: newDishImageUrl || null,
        };

        startTransition(async () => {
            const res = await createMenuItem(restaurant.slug, restaurant.id, input);
            if (res.success && res.data?.item) {
                setMenuItems((prev) => [res.data!.item, ...prev]);
                setIsAddDishModalOpen(false);
                setNewDishName('');
                setNewDishDesc('');
                setNewDishPrice('');
                setNewDishImageUrl('');
                setNewDishAllergens('');
                showNotice('success', `Added "${input.name}" to menu.`);
            } else {
                showNotice('error', res.error || 'Failed to create menu item.');
            }
        });
    };

    // Delete Dish
    const handleDeleteDish = (item: MenuItem) => {
        if (!confirm(`Are you sure you want to delete "${item.name}" from your menu?`)) return;

        setMenuItems((prev) => prev.filter((i) => i.id !== item.id));

        startTransition(async () => {
            const res = await deleteMenuItem(restaurant.slug, restaurant.id, item.id);
            if (!res.success) {
                setMenuItems((prev) => [item, ...prev]);
                showNotice('error', res.error || 'Failed to delete dish.');
            } else {
                showNotice('success', `Deleted "${item.name}".`);
            }
        });
    };

    // Save Settings
    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const res = await updateRestaurantSettings(
                restaurant.slug,
                restaurant.id,
                settingsForm
            );
            if (res.success) {
                showNotice('success', 'Restaurant settings saved successfully.');
            } else {
                showNotice('error', res.error || 'Failed to save settings.');
            }
        });
    };

    // Logout
    const handleLogout = () => {
        startTransition(async () => {
            await logoutOwner(restaurant.slug);
            router.refresh();
        });
    };

    // Filtered menu items
    const filteredMenuItems = useMemo(() => {
        return menuItems.filter((item) => {
            if (selectedCategoryFilter !== 'ALL' && item.category_id !== selectedCategoryFilter) {
                return false;
            }
            if (vegOnlyFilter && !item.is_veg) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = item.name.toLowerCase().includes(q);
                const matchDesc = item.description?.toLowerCase().includes(q);
                if (!matchName && !matchDesc) return false;
            }
            return true;
        });
    }, [menuItems, selectedCategoryFilter, vegOnlyFilter, searchQuery]);

    // Current origin for QR codes
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dineos.app';

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-orange-500 selection:text-white pb-20">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80 print:hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
                    {/* Brand / Logo */}
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-md"
                            style={{ backgroundColor: restaurant.primary_color || '#EA580C' }}
                        >
                            {restaurant.name.charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-extrabold text-base text-white tracking-tight leading-none">
                                    {restaurant.name}
                                </h1>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60 uppercase">
                                    Owner Portal
                                </span>
                            </div>
                            <p className="text-xs text-zinc-400 font-mono mt-0.5">
                                slug: /{restaurant.slug} • Logged in as {adminName}
                            </p>
                        </div>
                    </div>

                    {/* Quick Surface Links */}
                    <div className="flex items-center gap-2">
                        <a
                            href={`/r/${restaurant.slug}/t/T1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-800 transition"
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
                            <span>Preview T1 Menu</span>
                        </a>

                        <a
                            href={`/staff/${restaurant.slug}/floor`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-800 transition"
                        >
                            <ChefHat className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Staff Floor Map</span>
                        </a>

                        <button
                            type="button"
                            onClick={handleLogout}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/40 text-xs font-semibold text-red-300 border border-red-800/60 transition cursor-pointer"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Lock</span>
                        </button>
                    </div>
                </div>

                {/* Subnav Tabs */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto border-t border-zinc-900 py-2 scrollbar-none">
                    <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                            activeTab === 'overview'
                                ? 'bg-zinc-800 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                    >
                        <LayoutDashboard className="w-4 h-4 text-orange-400" />
                        <span>Overview & Revenue</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('menu')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                            activeTab === 'menu'
                                ? 'bg-zinc-800 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                    >
                        <UtensilsCrossed className="w-4 h-4 text-emerald-400" />
                        <span>Menu & Live Stock</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-700 text-zinc-300">
                            {menuItems.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('qrs')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                            activeTab === 'qrs'
                                ? 'bg-zinc-800 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                    >
                        <QrCode className="w-4 h-4 text-blue-400" />
                        <span>QR Standees & Tables</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-700 text-zinc-300">
                            {tables.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('settings')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                            activeTab === 'settings'
                                ? 'bg-zinc-800 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                    >
                        <Settings className="w-4 h-4 text-purple-400" />
                        <span>Restaurant Settings</span>
                    </button>
                </div>
            </header>

            {/* Notification Toast */}
            {actionMessage && (
                <div className="fixed top-20 right-4 z-50 animate-bounce print:hidden">
                    <div
                        className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2 text-xs font-bold ${
                            actionMessage.type === 'success'
                                ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
                                : 'bg-red-950 text-red-200 border-red-800'
                        }`}
                    >
                        {actionMessage.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span>{actionMessage.text}</span>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                {/* -------------------------------------------------------------
                    TAB 1: OVERVIEW & REVENUE
                   ------------------------------------------------------------- */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* 4 KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Today's Revenue */}
                            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 backdrop-blur shadow-sm space-y-2">
                                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                                    <span>Today&apos;s Revenue</span>
                                    <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                                        <DollarSign className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
                                    ₹{todayRevenue.toLocaleString('en-IN')}
                                </div>
                                <p className="text-[11px] text-zinc-400">
                                    {todayPaidPayments.length} paid bills settled today
                                </p>
                            </div>

                            {/* All-Time Paid Revenue */}
                            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 backdrop-blur shadow-sm space-y-2">
                                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                                    <span>Total Settled Revenue</span>
                                    <div className="w-8 h-8 rounded-xl bg-orange-950/60 border border-orange-800/60 flex items-center justify-center text-orange-400">
                                        <TrendingUp className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
                                    ₹{totalRevenueAllTime.toLocaleString('en-IN')}
                                </div>
                                <p className="text-[11px] text-zinc-400">
                                    Across {allPaidPayments.length} all-time paid payments
                                </p>
                            </div>

                            {/* Total Orders */}
                            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 backdrop-blur shadow-sm space-y-2">
                                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                                    <span>Total Orders</span>
                                    <div className="w-8 h-8 rounded-xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400">
                                        <ShoppingBag className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
                                    {validOrdersCount}
                                </div>
                                <p className="text-[11px] text-zinc-400">
                                    Active / completed kitchen orders
                                </p>
                            </div>

                            {/* Average Rating & Feedback */}
                            <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 backdrop-blur shadow-sm space-y-2">
                                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                                    <span>Guest Satisfaction</span>
                                    <div className="w-8 h-8 rounded-xl bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
                                        <Star className="w-4 h-4 fill-amber-400" />
                                    </div>
                                </div>
                                <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
                                    <span>{averageRating ? `${averageRating} ★` : 'No ratings'}</span>
                                    {reviews.length > 0 && (
                                        <span className="text-xs text-zinc-400 font-normal">
                                            ({reviews.length} reviews)
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-zinc-400">
                                    {privateFeedbackCount > 0 ? (
                                        <span className="text-rose-400 font-semibold">
                                            {privateFeedbackCount} private feedback items
                                        </span>
                                    ) : (
                                        '100% positive reviews'
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Two Columns: Recent Payments Ledger & Private Feedback Inbox */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Payments Ledger */}
                            <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 backdrop-blur space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Receipt className="w-5 h-5 text-emerald-400" />
                                        <h2 className="font-bold text-base text-white">Recent Payments Ledger</h2>
                                    </div>
                                    <span className="text-xs text-zinc-400 font-mono">
                                        {payments.length} transactions
                                    </span>
                                </div>

                                {payments.length === 0 ? (
                                    <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-400 text-xs">
                                        No payment transactions recorded yet. Payments will populate automatically as diners settle bills.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                                                    <th className="py-2.5">Time</th>
                                                    <th className="py-2.5">Guest / Table</th>
                                                    <th className="py-2.5">Method</th>
                                                    <th className="py-2.5">Status</th>
                                                    <th className="py-2.5 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/60 font-mono">
                                                {payments.slice(0, 10).map((p) => (
                                                    <tr key={p.id} className="hover:bg-zinc-800/30 transition">
                                                        <td className="py-3 text-zinc-400">
                                                            {new Date(p.created_at).toLocaleTimeString('en-IN', {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </td>
                                                        <td className="py-3 font-sans font-medium text-white">
                                                            {p.paid_by_name || 'Guest'}
                                                        </td>
                                                        <td className="py-3">
                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-300">
                                                                {p.method}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 font-sans">
                                                            <span
                                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                    p.status === 'PAID'
                                                                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                                                                        : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                                                }`}
                                                            >
                                                                {p.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 text-right font-bold text-white">
                                                            ₹{Number(p.total_amount).toLocaleString('en-IN')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Private Feedback & Google Review Funnel Inbox */}
                            <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 backdrop-blur space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5 text-amber-400" />
                                        <h2 className="font-bold text-base text-white">Guest Feedback & Reviews</h2>
                                    </div>
                                    <span className="text-xs text-zinc-400 font-mono">
                                        {reviews.length} entries
                                    </span>
                                </div>

                                {reviews.length === 0 ? (
                                    <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-400 text-xs">
                                        No reviews submitted yet. When guests rate 4–5★ they are redirected to Google Reviews; 1–3★ ratings appear privately here for your review.
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                                        {reviews.map((rev) => {
                                            const isNegative = rev.rating <= 3;
                                            return (
                                                <div
                                                    key={rev.id}
                                                    className={`p-4 rounded-2xl border transition ${
                                                        isNegative
                                                            ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                                                            : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-300'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-white text-xs">
                                                                    {rev.guest_name || 'Anonymous Guest'}
                                                                </span>
                                                                <span className="text-amber-400 text-xs tracking-wider">
                                                                    {'★'.repeat(rev.rating)}
                                                                    <span className="text-zinc-600">
                                                                        {'★'.repeat(5 - rev.rating)}
                                                                    </span>
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-zinc-400">
                                                                {new Date(rev.created_at).toLocaleDateString('en-IN', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </span>
                                                        </div>

                                                        {rev.redirected_to_google ? (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/70 text-blue-300 border border-blue-800/60 inline-flex items-center gap-1">
                                                                <Globe className="w-3 h-3" />
                                                                <span>Google Redirected</span>
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800/60 inline-flex items-center gap-1">
                                                                <AlertCircle className="w-3 h-3" />
                                                                <span>Private Feedback</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    {rev.comment ? (
                                                        <p className="mt-2 text-xs italic text-zinc-200 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800/50">
                                                            &ldquo;{rev.comment}&rdquo;
                                                        </p>
                                                    ) : (
                                                        <p className="mt-1 text-[11px] text-zinc-400">
                                                            No written comment provided.
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* -------------------------------------------------------------
                    TAB 2: MENU & LIVE STOCK AVAILABILITY
                   ------------------------------------------------------------- */}
                {activeTab === 'menu' && (
                    <div className="space-y-6">
                        {/* Header Actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">
                                    Menu & 86&apos;d Stock Manager
                                </h2>
                                <p className="text-xs text-zinc-400">
                                    1-tap toggle dishes in/out of stock or update pricing in real-time.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsAddDishModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition shadow-lg shadow-orange-600/30 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add New Dish</span>
                            </button>
                        </div>

                        {/* Search & Filters */}
                        <div className="p-4 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 space-y-3">
                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* Search Bar */}
                                <div className="relative flex-1">
                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    <input
                                        type="text"
                                        placeholder="Search dish by name or description..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-orange-500"
                                    />
                                </div>

                                {/* Veg Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setVegOnlyFilter(!vegOnlyFilter)}
                                    className={`px-3 py-2 rounded-2xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                                        vegOnlyFilter
                                            ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                    }`}
                                >
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    <span>Pure Veg Only</span>
                                </button>
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategoryFilter('ALL')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                                        selectedCategoryFilter === 'ALL'
                                            ? 'bg-orange-500 text-white shadow-sm'
                                            : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                                    }`}
                                >
                                    All Dishes ({menuItems.length})
                                </button>

                                {categories.map((cat) => {
                                    const count = menuItems.filter((i) => i.category_id === cat.id).length;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setSelectedCategoryFilter(cat.id)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                                                selectedCategoryFilter === cat.id
                                                    ? 'bg-orange-500 text-white shadow-sm'
                                                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                                            }`}
                                        >
                                            {cat.name} ({count})
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Dish List */}
                        {filteredMenuItems.length === 0 ? (
                            <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl text-zinc-400 text-xs space-y-2">
                                <p className="font-semibold text-zinc-300">No menu items match your filter.</p>
                                <p>Try clearing search queries or switch to another category.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredMenuItems.map((item) => {
                                    const cat = categories.find((c) => c.id === item.category_id);
                                    const station = stations.find((s) => s.id === item.station_id);
                                    const isEditingPrice = editingPriceId === item.id;

                                    return (
                                        <div
                                            key={item.id}
                                            className={`p-4 rounded-3xl border transition flex flex-col justify-between gap-3 ${
                                                item.is_available
                                                    ? 'bg-zinc-900/90 border-zinc-800/90'
                                                    : 'bg-zinc-950 border-rose-950/60 opacity-75'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                {/* Details */}
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                                item.is_veg ? 'bg-emerald-500' : 'bg-red-500'
                                                            }`}
                                                            title={item.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                                                        />
                                                        <h3 className="font-bold text-sm text-white">
                                                            {item.name}
                                                        </h3>
                                                    </div>

                                                    {item.description && (
                                                        <p className="text-xs text-zinc-400 line-clamp-2">
                                                            {item.description}
                                                        </p>
                                                    )}

                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                                                        {cat && (
                                                            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                                                                {cat.name}
                                                            </span>
                                                        )}
                                                        {station && (
                                                            <span className="px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-300 border border-blue-900/40">
                                                                {station.name}
                                                            </span>
                                                        )}
                                                        {item.spice !== 'NONE' && (
                                                            <span className="px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-900/40">
                                                                {item.spice}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Stock Status Badge */}
                                                <div>
                                                    <span
                                                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 ${
                                                            item.is_available
                                                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                                                                : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                                                        }`}
                                                    >
                                                        {item.is_available ? (
                                                            <>
                                                                <Check className="w-3 h-3" />
                                                                <span>In Stock</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <EyeOff className="w-3 h-3" />
                                                                <span>Sold Out</span>
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Bottom Controls: Inline Price + Stock Toggle + Delete */}
                                            <div className="pt-3 border-t border-zinc-800/70 flex items-center justify-between gap-2">
                                                {/* Inline Price Editor */}
                                                <div className="flex items-center gap-1.5">
                                                    {isEditingPrice ? (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-zinc-400 text-xs font-mono">₹</span>
                                                            <input
                                                                type="number"
                                                                value={tempPrice}
                                                                onChange={(e) => setTempPrice(e.target.value)}
                                                                className="w-20 bg-zinc-950 border border-orange-500 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none"
                                                                autoFocus
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSavePrice(item)}
                                                                className="p-1 rounded-lg bg-orange-600 text-white hover:bg-orange-500 transition"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingPriceId(null)}
                                                                className="p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingPriceId(item.id);
                                                                setTempPrice(String(item.base_price));
                                                            }}
                                                            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-xs font-mono font-bold text-white transition cursor-pointer group"
                                                            title="Click to edit price"
                                                        >
                                                            <span>₹{item.base_price}</span>
                                                            <Edit2 className="w-3 h-3 text-zinc-400 group-hover:text-orange-400" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Stock Toggle & Delete */}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={isPending}
                                                        onClick={() => handleToggleStock(item)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                                                            item.is_available
                                                                ? 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60'
                                                                : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60'
                                                        }`}
                                                    >
                                                        {item.is_available ? 'Mark 86 / Out' : 'Restore Stock'}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={isPending}
                                                        onClick={() => handleDeleteDish(item)}
                                                        className="p-2 rounded-xl bg-zinc-950 hover:bg-red-950/50 text-zinc-500 hover:text-red-400 border border-zinc-800/80 transition cursor-pointer"
                                                        title="Delete Dish"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Add Dish Modal */}
                        {isAddDishModalOpen && (
                            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                                        <h3 className="font-bold text-base text-white">Add New Menu Dish</h3>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddDishModalOpen(false)}
                                            className="text-zinc-400 hover:text-white p-1"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <form onSubmit={handleCreateDish} className="space-y-4 text-xs">
                                        <div>
                                            <label className="block text-zinc-300 font-semibold mb-1">
                                                Dish Name *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Paneer Tikka Masala"
                                                value={newDishName}
                                                onChange={(e) => setNewDishName(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-zinc-300 font-semibold mb-1">
                                                    Base Price (₹) *
                                                </label>
                                                <input
                                                    type="number"
                                                    required
                                                    min="0"
                                                    step="1"
                                                    placeholder="e.g. 320"
                                                    value={newDishPrice}
                                                    onChange={(e) => setNewDishPrice(e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-orange-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-zinc-300 font-semibold mb-1">
                                                    Diet Type
                                                </label>
                                                <div className="flex items-center gap-2 pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewDishIsVeg(true)}
                                                        className={`flex-1 py-1.5 rounded-xl font-bold transition ${
                                                            newDishIsVeg
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-zinc-950 text-zinc-400 border border-zinc-800'
                                                        }`}
                                                    >
                                                        Veg
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewDishIsVeg(false)}
                                                        className={`flex-1 py-1.5 rounded-xl font-bold transition ${
                                                            !newDishIsVeg
                                                                ? 'bg-red-600 text-white'
                                                                : 'bg-zinc-950 text-zinc-400 border border-zinc-800'
                                                        }`}
                                                    >
                                                        Non-Veg
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-zinc-300 font-semibold mb-1">
                                                    Category *
                                                </label>
                                                <select
                                                    value={newDishCategory}
                                                    onChange={(e) => setNewDishCategory(e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                                                >
                                                    {categories.map((c) => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-zinc-300 font-semibold mb-1">
                                                    Kitchen Station
                                                </label>
                                                <select
                                                    value={newDishStation}
                                                    onChange={(e) => setNewDishStation(e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                                                >
                                                    <option value="">No Station (Floor Only)</option>
                                                    {stations.map((s) => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-zinc-300 font-semibold mb-1">
                                                Spice Level
                                            </label>
                                            <select
                                                value={newDishSpice}
                                                onChange={(e) => setNewDishSpice(e.target.value as SpiceLevel)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                                            >
                                                <option value="NONE">None / Sweet</option>
                                                <option value="MILD">Mild</option>
                                                <option value="MEDIUM">Medium</option>
                                                <option value="SPICY">Spicy 🔥</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-zinc-300 font-semibold mb-1">
                                                Description
                                            </label>
                                            <textarea
                                                rows={2}
                                                placeholder="Fresh cottage cheese simmered in roasted tomato gravy..."
                                                value={newDishDesc}
                                                onChange={(e) => setNewDishDesc(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-zinc-300 font-semibold mb-1">
                                                Allergens (comma separated)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Dairy, Nuts, Gluten"
                                                value={newDishAllergens}
                                                onChange={(e) => setNewDishAllergens(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-zinc-300 font-semibold mb-1">
                                                Image URL (optional)
                                            </label>
                                            <input
                                                type="url"
                                                placeholder="https://images.unsplash.com/..."
                                                value={newDishImageUrl}
                                                onChange={(e) => setNewDishImageUrl(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                                            />
                                        </div>

                                        <div className="pt-2 flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsAddDishModalOpen(false)}
                                                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isPending}
                                                className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition disabled:opacity-50"
                                            >
                                                {isPending ? 'Adding...' : 'Add Dish'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* -------------------------------------------------------------
                    TAB 3: QR STANDEES & TABLES
                   ------------------------------------------------------------- */}
                {activeTab === 'qrs' && (
                    <div className="space-y-6">
                        {/* Header Action */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">
                                    Table QR Standees ({tables.length} Tables)
                                </h2>
                                <p className="text-xs text-zinc-400">
                                    Print ready high-contrast QR codes formatted for table acrylic standees or tent cards.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-zinc-700 transition shadow cursor-pointer"
                            >
                                <Printer className="w-4 h-4 text-orange-400" />
                                <span>Print All Table QRs</span>
                            </button>
                        </div>

                        {/* Print Only Banner */}
                        <div className="hidden print:block text-center pb-6 border-b border-black">
                            <h1 className="text-3xl font-black uppercase tracking-tight text-black">
                                {restaurant.name}
                            </h1>
                            <p className="text-sm text-gray-700 mt-1">
                                Dine-In Digital Ordering • Scan QR with your smartphone camera
                            </p>
                        </div>

                        {/* QR Standees Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print:grid-cols-2 print:gap-8">
                            {tables.map((table) => {
                                const tableUrl = `${origin}/r/${restaurant.slug}/t/${table.table_code}`;
                                const isCopied = copiedUrl === table.id;

                                return (
                                    <div
                                        key={table.id}
                                        className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800/80 flex flex-col items-center text-center justify-between shadow-lg print:border-2 print:border-black print:bg-white print:text-black print:p-8 print:break-inside-avoid"
                                    >
                                        <div className="space-y-1 mb-4">
                                            <div
                                                className="w-10 h-10 rounded-2xl mx-auto flex items-center justify-center font-bold text-white text-sm mb-2 shadow print:border print:border-black print:text-black print:bg-transparent"
                                                style={{ backgroundColor: restaurant.primary_color || '#EA580C' }}
                                            >
                                                {table.table_code}
                                            </div>
                                            <h3 className="font-extrabold text-lg text-white print:text-black">
                                                {table.display_name}
                                            </h3>
                                            <p className="text-xs text-zinc-400 print:text-gray-600 font-medium">
                                                Capacity: {table.capacity} Diners • {restaurant.name}
                                            </p>
                                        </div>

                                        {/* QR Code Container */}
                                        <div className="p-4 bg-white rounded-2xl shadow-inner border border-zinc-200/80 mb-4">
                                            <QRCodeSVG
                                                value={tableUrl}
                                                size={160}
                                                level="H"
                                                marginSize={2}
                                            />
                                        </div>

                                        <p className="text-[11px] text-zinc-400 print:text-black font-semibold mb-4">
                                            Point phone camera to view menu &amp; order
                                        </p>

                                        {/* Screen Only Action Buttons */}
                                        <div className="w-full flex items-center justify-center gap-2 print:hidden border-t border-zinc-800 pt-3">
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(tableUrl, table.id)}
                                                className="flex-1 py-2 px-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                {isCopied ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                        <span>Copied</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3.5 h-3.5" />
                                                        <span>Copy URL</span>
                                                    </>
                                                )}
                                            </button>

                                            <a
                                                href={tableUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                                                title="Open in new tab"
                                            >
                                                <ExternalLink className="w-4 h-4 text-orange-400" />
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* -------------------------------------------------------------
                    TAB 4: RESTAURANT SETTINGS
                   ------------------------------------------------------------- */}
                {activeTab === 'settings' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">
                                Restaurant Operational Settings
                            </h2>
                            <p className="text-xs text-zinc-400">
                                Update branding, tax percentage, Wi-Fi credentials, and Google review link.
                            </p>
                        </div>

                        <form
                            onSubmit={handleSaveSettings}
                            className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 backdrop-blur space-y-5 text-xs"
                        >
                            {/* Restaurant Name */}
                            <div>
                                <label className="block text-zinc-300 font-semibold mb-1.5">
                                    Restaurant Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={settingsForm.name}
                                    onChange={(e) =>
                                        setSettingsForm((prev) => ({ ...prev, name: e.target.value }))
                                    }
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 font-medium"
                                />
                            </div>

                            {/* Brand Color & Tax */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-zinc-300 font-semibold mb-1.5">
                                        Brand Primary Color (Hex) *
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={settingsForm.primaryColor}
                                            onChange={(e) =>
                                                setSettingsForm((prev) => ({
                                                    ...prev,
                                                    primaryColor: e.target.value,
                                                }))
                                            }
                                            className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            required
                                            value={settingsForm.primaryColor}
                                            onChange={(e) =>
                                                setSettingsForm((prev) => ({
                                                    ...prev,
                                                    primaryColor: e.target.value,
                                                }))
                                            }
                                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-2 text-white font-mono uppercase focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-zinc-300 font-semibold mb-1.5">
                                        GST / Tax Percentage (%) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        required
                                        value={settingsForm.taxPercentage}
                                        onChange={(e) =>
                                            setSettingsForm((prev) => ({
                                                ...prev,
                                                taxPercentage: parseFloat(e.target.value) || 0,
                                            }))
                                        }
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-orange-500"
                                    />
                                </div>
                            </div>

                            {/* Wi-Fi Settings */}
                            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 space-y-3">
                                <div className="flex items-center gap-2 text-zinc-300 font-bold">
                                    <Wifi className="w-4 h-4 text-blue-400" />
                                    <span>Guest Wi-Fi Auto-Share</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-zinc-400 text-[11px] mb-1">
                                            Wi-Fi SSID (Network Name)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Garnish_Guest_WiFi"
                                            value={settingsForm.wifiSsid || ''}
                                            onChange={(e) =>
                                                setSettingsForm((prev) => ({ ...prev, wifiSsid: e.target.value }))
                                            }
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-zinc-400 text-[11px] mb-1">
                                            Wi-Fi Password
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Welcome@2026"
                                            value={settingsForm.wifiPassword || ''}
                                            onChange={(e) =>
                                                setSettingsForm((prev) => ({
                                                    ...prev,
                                                    wifiPassword: e.target.value,
                                                }))
                                            }
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* UPI ID & Google Review */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-zinc-300 font-semibold mb-1">
                                        UPI ID / VPA (Instant Settlement)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. restaurant@okaxis or paytmqr..."
                                        value={settingsForm.upiId || ''}
                                        onChange={(e) =>
                                            setSettingsForm((prev) => ({ ...prev, upiId: e.target.value }))
                                        }
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-orange-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-zinc-300 font-semibold mb-1">
                                        Google Review Direct URL (for 4–5★ redirect funnel)
                                    </label>
                                    <input
                                        type="url"
                                        placeholder="https://g.page/r/..."
                                        value={settingsForm.googleReviewUrl || ''}
                                        onChange={(e) =>
                                            setSettingsForm((prev) => ({
                                                ...prev,
                                                googleReviewUrl: e.target.value,
                                            }))
                                        }
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"
                                    />
                                    <p className="text-[10px] text-zinc-400 mt-1">
                                        When diners leave a 4 or 5 star review, they are seamlessly prompted to post it on this link.
                                    </p>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-3">
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-sm transition shadow-lg shadow-orange-600/30 cursor-pointer disabled:opacity-50"
                                >
                                    {isPending ? 'Saving Settings...' : 'Save Restaurant Settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
}
