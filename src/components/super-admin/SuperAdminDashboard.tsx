'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
    Sparkles,
    LogOut,
    UtensilsCrossed,
    QrCode,
    ExternalLink,
    Copy,
    Check,
    Clock,
    Flame,
    Coffee,
    Pizza,
    ChevronDown,
    ChevronUp,
    Trash2,
    Search,
    Shield,
    Sliders,
    Wifi,
    Smartphone,
    X,
    Building2,
    Calendar,
    ChefHat,
    AlertTriangle,
} from 'lucide-react';
import { Restaurant, TenantStatus } from '@/types/database';
import { CUISINE_PRESETS, CuisinePreset } from '@/lib/presets/cuisines';
import {
    cloneRestaurantDemo,
    updateTenantStatus,
    deleteTenant,
    logoutSuperAdmin,
    CloneRestaurantInput,
} from '@/app/super-admin/actions';

interface SuperAdminDashboardProps {
    initialRestaurants: Restaurant[];
}

const PRESET_ICONS = {
    'north-indian': Flame,
    'cafe-bakery': Coffee,
    'fast-food-qsr': Pizza,
};

const COLOR_PALETTE = [
    { label: 'Amber Orange', hex: '#EA580C' },
    { label: 'Crimson Red', hex: '#DC2626' },
    { label: 'Emerald Green', hex: '#059669' },
    { label: 'Royal Indigo', hex: '#4F46E5' },
    { label: 'Sunset Amber', hex: '#D97706' },
    { label: 'Rose Pink', hex: '#E11D48' },
];

export function SuperAdminDashboard({ initialRestaurants }: SuperAdminDashboardProps) {
    const router = useRouter();
    const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    // Cloner Form State
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [primaryColor, setPrimaryColor] = useState('#EA580C');
    const [cuisinePreset, setCuisinePreset] = useState<CuisinePreset['id']>('north-indian');
    const [tableCount, setTableCount] = useState<number>(8);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [logoUrl, setLogoUrl] = useState('');
    const [wifiSsid, setWifiSsid] = useState('');
    const [wifiPassword, setWifiPassword] = useState('');
    const [upiId, setUpiId] = useState('');
    const [googleReviewUrl, setGoogleReviewUrl] = useState('');

    // Feedback States
    const [isCreating, startCreateTransition] = useTransition();
    const [isActionPending, startActionTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successTenant, setSuccessTenant] = useState<Restaurant | null>(null);

    // Active QR Modal
    const [qrModalTenant, setQrModalTenant] = useState<{
        restaurant: Restaurant;
        tableCode: string;
    } | null>(null);

    // Copy Feedback Map
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Handle Name to Slug auto-generation
    const handleNameChange = (val: string) => {
        setName(val);
        if (!slugManuallyEdited) {
            const autoSlug = val
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            setSlug(autoSlug);
        }
    };

    const handleCopy = (text: string, key: string) => {
        if (typeof window === 'undefined') return;
        const fullUrl = text.startsWith('http') ? text : `${window.location.origin}${text}`;
        navigator.clipboard.writeText(fullUrl);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleCreateDemo = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setSuccessTenant(null);

        if (!name.trim()) {
            setErrorMessage('Please enter a restaurant name.');
            return;
        }

        const payload: CloneRestaurantInput = {
            name,
            slug: slug || name,
            primaryColor,
            cuisinePreset,
            tableCount,
            logoUrl: logoUrl || undefined,
            wifiSsid: wifiSsid || undefined,
            wifiPassword: wifiPassword || undefined,
            upiId: upiId || undefined,
            googleReviewUrl: googleReviewUrl || undefined,
        };

        startCreateTransition(async () => {
            const res = await cloneRestaurantDemo(payload);
            if (res.success && res.data?.restaurant) {
                setRestaurants((prev) => [res.data!.restaurant, ...prev]);
                setSuccessTenant(res.data.restaurant);
                // Reset form fields
                setName('');
                setSlug('');
                setSlugManuallyEdited(false);
                setLogoUrl('');
                setWifiSsid('');
                setWifiPassword('');
                setUpiId('');
                setGoogleReviewUrl('');
                router.refresh();
            } else {
                setErrorMessage(res.error || 'Failed to create restaurant demo.');
            }
        });
    };

    const handleStatusChange = (restaurantId: string, newStatus: TenantStatus) => {
        startActionTransition(async () => {
            const res = await updateTenantStatus(restaurantId, newStatus);
            if (res.success) {
                setRestaurants((prev) =>
                    prev.map((r) => (r.id === restaurantId ? { ...r, status: newStatus } : r))
                );
            } else {
                alert(res.error || 'Failed to update status');
            }
        });
    };

    const handleDelete = (restaurantId: string, restaurantName: string) => {
        if (!confirm(`Are you sure you want to permanently delete "${restaurantName}"? All categories, items, and tables will be wiped.`)) {
            return;
        }

        startActionTransition(async () => {
            const res = await deleteTenant(restaurantId);
            if (res.success) {
                setRestaurants((prev) => prev.filter((r) => r.id !== restaurantId));
                if (successTenant?.id === restaurantId) setSuccessTenant(null);
            } else {
                alert(res.error || 'Failed to delete tenant');
            }
        });
    };

    const handleLogout = () => {
        startActionTransition(async () => {
            await logoutSuperAdmin();
            router.refresh();
        });
    };

    // Filtered Restaurants
    const filteredRestaurants = useMemo(() => {
        return restaurants.filter((r) => {
            const matchesSearch =
                r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.slug.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [restaurants, searchQuery, filterStatus]);

    // Metrics
    const metrics = useMemo(() => {
        const total = restaurants.length;
        const demo = restaurants.filter((r) => r.status === 'DEMO').length;
        const active = restaurants.filter((r) => r.status === 'ACTIVE' || r.status === 'TRIAL').length;
        const paused = restaurants.filter((r) => r.status === 'PAUSED').length;
        return { total, demo, active, paused };
    }, [restaurants]);

    const getRemainingDays = (expiresAt: string | null) => {
        if (!expiresAt) return null;
        const diff = new Date(expiresAt).getTime() - Date.now();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
            {/* Top Navigation */}
            <header className="sticky top-0 z-30 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md px-4 lg:px-8 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-md shadow-orange-600/30">
                        <UtensilsCrossed className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold text-white tracking-tight">DineOS</h1>
                            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                Super Admin
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400">Multi-Tenant Control Room & Pitch Engine</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 bg-zinc-800/60 px-3 py-1.5 rounded-lg border border-zinc-700/60">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Master Session Active</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        disabled={isActionPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white border border-zinc-700 transition cursor-pointer"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </header>

            {/* Metrics Ribbon */}
            <div className="bg-zinc-900/40 border-b border-zinc-800/80 px-4 lg:px-8 py-3">
                <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
                        <span className="text-xs text-zinc-400">Total Tenants</span>
                        <div className="text-xl font-bold text-white mt-0.5">{metrics.total}</div>
                    </div>
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
                        <span className="text-xs text-amber-400">Live Demos</span>
                        <div className="text-xl font-bold text-amber-400 mt-0.5">{metrics.demo}</div>
                    </div>
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
                        <span className="text-xs text-emerald-400">Active / Trials</span>
                        <div className="text-xl font-bold text-emerald-400 mt-0.5">{metrics.active}</div>
                    </div>
                    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
                        <span className="text-xs text-zinc-400">Paused</span>
                        <div className="text-xl font-bold text-zinc-400 mt-0.5">{metrics.paused}</div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-8">
                {/* 2-Minute Pitch Cloner Card */}
                <section className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 lg:p-7 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-1">
                                <Sparkles className="w-3.5 h-3.5" /> 2-Minute Pitch Cloner
                            </div>
                            <h2 className="text-xl font-bold text-white">Generate Live Branded Demo Tenant</h2>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Instantly seeds 15–20 real menu items with photos, kitchen stations, tables, and 4-digit staff PINs.
                            </p>
                        </div>
                    </div>

                    {/* Success Banner */}
                    {successTenant && (
                        <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-600/50 rounded-xl text-emerald-200 animate-fadeIn">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <h3 className="font-semibold text-white text-sm">
                                            Demo Provisioned: {successTenant.name}
                                        </h3>
                                    </div>
                                    <p className="text-xs text-emerald-300">
                                        Slug: <code className="bg-emerald-900/50 px-1.5 py-0.5 rounded text-emerald-200">/r/{successTenant.slug}/t/T1</code>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setQrModalTenant({ restaurant: successTenant, tableCode: 'T1' })}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition shadow cursor-pointer"
                                    >
                                        <QrCode className="w-3.5 h-3.5" />
                                        <span>Show Table 1 QR</span>
                                    </button>
                                    <button
                                        onClick={() => setSuccessTenant(null)}
                                        className="text-zinc-400 hover:text-white p-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Banner */}
                    {errorMessage && (
                        <div className="mb-6 p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                            <button onClick={() => setErrorMessage(null)} className="text-zinc-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleCreateDemo} className="space-y-6">
                        {/* Row 1: Name & Slug */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                    Restaurant Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="e.g. Copper Chimney or Blue Tokai"
                                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                    Tenant Slug (URL Path) *
                                </label>
                                <div className="flex items-center rounded-xl bg-zinc-950 border border-zinc-700/80 overflow-hidden focus-within:ring-2 focus-within:ring-orange-500">
                                    <span className="px-3 text-xs text-zinc-400 select-none bg-zinc-900 py-2.5 border-r border-zinc-800">
                                        /r/
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        value={slug}
                                        onChange={(e) => {
                                            setSlug(e.target.value);
                                            setSlugManuallyEdited(true);
                                        }}
                                        placeholder="copper-chimney"
                                        className="w-full px-3 py-2 bg-transparent text-white placeholder-zinc-500 focus:outline-none text-sm font-mono"
                                    />
                                    <span className="px-3 text-xs text-zinc-400 select-none bg-zinc-900 py-2.5 border-l border-zinc-800">
                                        /t/T1
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Cuisine Preset Selection */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                                Cuisine Preset & Menu Template *
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {(Object.keys(CUISINE_PRESETS) as CuisinePreset['id'][]).map((presetId) => {
                                    const preset = CUISINE_PRESETS[presetId];
                                    const IconComponent = PRESET_ICONS[presetId] || UtensilsCrossed;
                                    const isSelected = cuisinePreset === presetId;

                                    return (
                                        <div
                                            key={presetId}
                                            onClick={() => setCuisinePreset(presetId)}
                                            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                                isSelected
                                                    ? 'bg-orange-500/10 border-orange-500 ring-1 ring-orange-500/30'
                                                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div
                                                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                                        isSelected
                                                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                                            : 'bg-zinc-800 text-zinc-400'
                                                    }`}
                                                >
                                                    <IconComponent className="w-5 h-5" />
                                                </div>
                                                <span
                                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                        isSelected
                                                            ? 'bg-orange-500/20 text-orange-300'
                                                            : 'bg-zinc-800 text-zinc-400'
                                                    }`}
                                                >
                                                    {preset.items.length} Items
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-white">{preset.label}</h4>
                                                <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                                                    Stations: {preset.stations.join(', ')}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Row 3: Brand Color & Table Count */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                    Primary Brand Color
                                </label>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <input
                                                type="color"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                className="w-10 h-10 rounded-lg border border-zinc-700 bg-zinc-950 cursor-pointer overflow-hidden p-0"
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            value={primaryColor}
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                            placeholder="#EA580C"
                                            className="w-32 px-3 py-2 bg-zinc-950 border border-zinc-700/80 rounded-xl text-white font-mono text-xs uppercase"
                                        />
                                        <div
                                            className="h-9 px-3 rounded-xl flex items-center justify-center text-xs font-semibold text-white shadow"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            Preview CTA
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {COLOR_PALETTE.map((pal) => (
                                            <button
                                                key={pal.hex}
                                                type="button"
                                                onClick={() => setPrimaryColor(pal.hex)}
                                                className="w-6 h-6 rounded-md border border-zinc-700 hover:scale-110 transition cursor-pointer"
                                                style={{ backgroundColor: pal.hex }}
                                                title={pal.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                        Table Count: <span className="text-orange-400 font-mono">{tableCount}</span> (T1..T{tableCount})
                                    </label>
                                </div>
                                <div className="space-y-2">
                                    <input
                                        type="range"
                                        min="1"
                                        max="30"
                                        value={tableCount}
                                        onChange={(e) => setTableCount(Number(e.target.value))}
                                        className="w-full accent-orange-500 cursor-pointer"
                                    />
                                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                                        <span>1 Table</span>
                                        <span>8 Tables (Default)</span>
                                        <span>30 Tables</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Expandable Advanced Fields */}
                        <div className="border-t border-zinc-800/80 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                            >
                                <Sliders className="w-3.5 h-3.5" />
                                <span>Optional Tenant Settings (Wi-Fi, UPI, Reviews, Logo)</span>
                                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {showAdvanced && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-fadeIn">
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">Logo URL (Optional)</label>
                                        <input
                                            type="url"
                                            value={logoUrl}
                                            onChange={(e) => setLogoUrl(e.target.value)}
                                            placeholder="https://example.com/logo.png"
                                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">UPI ID (Optional)</label>
                                        <input
                                            type="text"
                                            value={upiId}
                                            onChange={(e) => setUpiId(e.target.value)}
                                            placeholder="copperchimney@okhdfcbank"
                                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">Wi-Fi SSID</label>
                                        <input
                                            type="text"
                                            value={wifiSsid}
                                            onChange={(e) => setWifiSsid(e.target.value)}
                                            placeholder="CopperChimney_Guest"
                                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-1">Wi-Fi Password</label>
                                        <input
                                            type="text"
                                            value={wifiPassword}
                                            onChange={(e) => setWifiPassword(e.target.value)}
                                            placeholder="ButterChicken2026"
                                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs text-zinc-400 mb-1">Google Review URL</label>
                                        <input
                                            type="url"
                                            value={googleReviewUrl}
                                            onChange={(e) => setGoogleReviewUrl(e.target.value)}
                                            placeholder="https://g.page/r/example/review"
                                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit CTA */}
                        <div className="flex items-center justify-end pt-2">
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-[0.99] transition shadow-lg shadow-orange-600/25 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                            >
                                {isCreating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span>Provisioning Demo Tenant (Cloning Preset)...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        <span>Generate Live Demo in 2 Minutes</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Active Tenants List */}
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-zinc-400" />
                                <span>Active Restaurant Tenants ({filteredRestaurants.length})</span>
                            </h2>
                            <p className="text-xs text-zinc-400">
                                Realtime status, one-click surface launcher, and live table QR codes.
                            </p>
                        </div>

                        {/* Search & Status Filter */}
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Filter by name/slug..."
                                    className="pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                />
                            </div>

                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="DEMO">DEMO</option>
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="TRIAL">TRIAL</option>
                                <option value="PAUSED">PAUSED</option>
                            </select>
                        </div>
                    </div>

                    {/* Tenants Grid / Table */}
                    {filteredRestaurants.length === 0 ? (
                        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-12 text-center text-zinc-400">
                            <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
                            <p className="text-sm font-medium text-zinc-300">No restaurants found</p>
                            <p className="text-xs text-zinc-400 mt-1">
                                {restaurants.length === 0
                                    ? 'Use the 2-Minute Pitch Cloner above to create your first demo tenant.'
                                    : 'No tenants match your search filter.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredRestaurants.map((restaurant) => {
                                const remainingDays = getRemainingDays(restaurant.demo_expires_at);

                                return (
                                    <div
                                        key={restaurant.id}
                                        className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-5 hover:border-zinc-700/80 transition-all space-y-4"
                                    >
                                        {/* Header Row: Info, Status, Delete */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-base shrink-0"
                                                    style={{ backgroundColor: restaurant.primary_color || '#EA580C' }}
                                                >
                                                    {restaurant.logo_url ? (
                                                        <img
                                                            src={restaurant.logo_url}
                                                            alt={restaurant.name}
                                                            className="w-full h-full object-cover rounded-xl"
                                                        />
                                                    ) : (
                                                        restaurant.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-base font-bold text-white">{restaurant.name}</h3>
                                                        <span className="text-xs font-mono text-zinc-400">
                                                            ({restaurant.slug})
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-0.5">
                                                        <span className="capitalize">
                                                            {restaurant.cuisine_preset?.replace('-', ' ') || 'Custom Cuisine'}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(restaurant.created_at).toLocaleDateString('en-IN', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric',
                                                            })}
                                                        </span>
                                                        {restaurant.status === 'DEMO' && remainingDays !== null && (
                                                            <>
                                                                <span>•</span>
                                                                <span
                                                                    className={`flex items-center gap-1 font-medium ${
                                                                        remainingDays > 2 ? 'text-amber-400' : 'text-red-400'
                                                                    }`}
                                                                >
                                                                    <Clock className="w-3 h-3" />
                                                                    {remainingDays > 0 ? `${remainingDays}d demo left` : 'Demo Expired'}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status Selector & Delete */}
                                            <div className="flex items-center gap-2 self-start sm:self-center">
                                                <select
                                                    value={restaurant.status}
                                                    onChange={(e) =>
                                                        handleStatusChange(restaurant.id, e.target.value as TenantStatus)
                                                    }
                                                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer focus:outline-none ${
                                                        restaurant.status === 'ACTIVE'
                                                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                                                            : restaurant.status === 'DEMO'
                                                            ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                                                            : restaurant.status === 'TRIAL'
                                                            ? 'bg-blue-950/60 text-blue-400 border-blue-800'
                                                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                                    }`}
                                                >
                                                    <option value="DEMO">DEMO</option>
                                                    <option value="TRIAL">TRIAL</option>
                                                    <option value="ACTIVE">ACTIVE</option>
                                                    <option value="PAUSED">PAUSED</option>
                                                </select>

                                                <button
                                                    onClick={() => handleDelete(restaurant.id, restaurant.name)}
                                                    className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition"
                                                    title="Delete Tenant"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Action Links Row (3 Surfaces + QR Modal) */}
                                        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                                            {/* 1. Guest Web App */}
                                            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                                                <div className="flex items-center gap-2 truncate">
                                                    <Smartphone className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                                    <span className="text-zinc-300 font-medium truncate">Guest App (T1)</span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                                    <button
                                                        onClick={() =>
                                                            handleCopy(
                                                                `/r/${restaurant.slug}/t/T1`,
                                                                `guest-${restaurant.id}`
                                                            )
                                                        }
                                                        className="p-1 hover:text-white text-zinc-400 rounded"
                                                        title="Copy URL"
                                                    >
                                                        {copiedKey === `guest-${restaurant.id}` ? (
                                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                    <a
                                                        href={`/r/${restaurant.slug}/t/T1`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1 hover:text-white text-zinc-400 rounded"
                                                        title="Open in new tab"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            </div>

                                            {/* 2. Floor / Waiter App */}
                                            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                                                <div className="flex items-center gap-2 truncate">
                                                    <ChefHat className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                    <div className="truncate">
                                                        <span className="text-zinc-300 font-medium">Floor Staff</span>
                                                        <span className="text-[10px] text-zinc-400 ml-1">PIN: 2222</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                                    <button
                                                        onClick={() =>
                                                            handleCopy(
                                                                `/staff/${restaurant.slug}/floor`,
                                                                `floor-${restaurant.id}`
                                                            )
                                                        }
                                                        className="p-1 hover:text-white text-zinc-400 rounded"
                                                        title="Copy URL"
                                                    >
                                                        {copiedKey === `floor-${restaurant.id}` ? (
                                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                    <a
                                                        href={`/staff/${restaurant.slug}/floor`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1 hover:text-white text-zinc-400 rounded"
                                                        title="Open in new tab"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            </div>

                                            {/* 3. Kitchen Display (KDS) */}
                                            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                                                <div className="flex items-center gap-2 truncate">
                                                    <Flame className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                    <div className="truncate">
                                                        <span className="text-zinc-300 font-medium">Kitchen (KDS)</span>
                                                        <span className="text-[10px] text-zinc-400 ml-1">PIN: 3333</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                                    <button
                                                        onClick={() =>
                                                            handleCopy(
                                                                `/staff/${restaurant.slug}/kds`,
                                                                `kds-${restaurant.id}`
                                                            )
                                                        }
                                                        className="p-1 hover:text-white text-zinc-400 rounded"
                                                        title="Copy URL"
                                                    >
                                                        {copiedKey === `kds-${restaurant.id}` ? (
                                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                    <a
                                                        href={`/staff/${restaurant.slug}/kds`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1 hover:text-white text-zinc-400 rounded"
                                                        title="Open in new tab"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                            </div>

                                            {/* 4. Table 1 QR Modal Trigger */}
                                            <button
                                                onClick={() =>
                                                    setQrModalTenant({ restaurant, tableCode: 'T1' })
                                                }
                                                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 border border-orange-500/20 transition cursor-pointer font-medium"
                                            >
                                                <QrCode className="w-4 h-4" />
                                                <span>Scan Table 1 QR</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            {/* QR Code Preview Modal */}
            {qrModalTenant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative">
                        <button
                            onClick={() => setQrModalTenant(null)}
                            className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="inline-flex p-3 rounded-2xl bg-white text-zinc-950 shadow-xl border-4 border-zinc-200">
                            <QRCodeSVG
                                value={
                                    typeof window !== 'undefined'
                                        ? `${window.location.origin}/r/${qrModalTenant.restaurant.slug}/t/${qrModalTenant.tableCode}`
                                        : `/r/${qrModalTenant.restaurant.slug}/t/${qrModalTenant.tableCode}`
                                }
                                size={220}
                                level="H"
                                includeMargin={false}
                            />
                        </div>

                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-orange-400 mb-0.5">
                                Live Sales Pitch Standee
                            </div>
                            <h3 className="text-xl font-bold text-white">{qrModalTenant.restaurant.name}</h3>
                            <p className="text-sm font-semibold text-zinc-300 mt-1">
                                Table: {qrModalTenant.tableCode}
                            </p>
                            <p className="text-xs text-zinc-400 mt-1">
                                Scan with any smartphone camera to open the instant white-label guest menu.
                            </p>
                        </div>

                        {/* Wi-Fi Details if present */}
                        {qrModalTenant.restaurant.wifi_ssid && (
                            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-300 flex items-center justify-center gap-2">
                                <Wifi className="w-3.5 h-3.5 text-zinc-400" />
                                <span>SSID: <strong>{qrModalTenant.restaurant.wifi_ssid}</strong></span>
                                {qrModalTenant.restaurant.wifi_password && (
                                    <span>• Pass: <strong>{qrModalTenant.restaurant.wifi_password}</strong></span>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-2 pt-2">
                            <button
                                onClick={() =>
                                    handleCopy(
                                        `/r/${qrModalTenant.restaurant.slug}/t/${qrModalTenant.tableCode}`,
                                        'modal-qr'
                                    )
                                }
                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white transition"
                            >
                                {copiedKey === 'modal-qr' ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Copied URL!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy URL</span>
                                    </>
                                )}
                            </button>

                            <a
                                href={`/r/${qrModalTenant.restaurant.slug}/t/${qrModalTenant.tableCode}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-medium bg-orange-600 hover:bg-orange-500 text-white transition shadow"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Open Menu</span>
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
