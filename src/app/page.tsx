import React from 'react';
import Link from 'next/link';
import {
    QrCode,
    Sparkles,
    Users,
    ChefHat,
    Receipt,
    Star,
    Layers,
    Shield,
    Smartphone,
    ArrowRight,
    Store,
    Zap,
} from 'lucide-react';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-orange-500 selection:text-white">
            {/* Top Navigation */}
            <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-600/30">
                            <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="font-black text-lg text-white tracking-tight">
                                Dine<span className="text-orange-500">OS</span>
                            </span>
                            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                Smart Dine-In Platform
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/super-admin"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition shadow-md shadow-orange-600/30"
                        >
                            <Shield className="w-3.5 h-3.5" />
                            <span>Super Admin Control Room</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
                {/* Background Glow */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-b from-orange-600/20 to-amber-500/0 rounded-full blur-3xl pointer-events-none" />

                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-orange-400 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>White-Label QR Dine-In Operating System</span>
                    </div>

                    <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight sm:leading-none">
                        Turn Every Restaurant Table into a{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">
                            Live, Shared Ordering Terminal
                        </span>
                    </h1>

                    <p className="max-w-3xl mx-auto text-base sm:text-lg text-zinc-400 leading-relaxed">
                        Zero app download. Multi-guest shared cart, waiter floor coordination with prank-safe approval, station-routed KDS, itemized split billing, and an automated 5-star Google review funnel.
                    </p>

                    {/* CTAs */}
                    <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                        <Link
                            href="/super-admin"
                            className="px-6 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-sm transition shadow-xl shadow-orange-600/40 flex items-center gap-2 group"
                        >
                            <span>Launch 2-Minute Pitch Cloner</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                        </Link>

                        <a
                            href="/r/garnish-annex/t/T1"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-sm border border-zinc-800 transition flex items-center gap-2"
                        >
                            <Smartphone className="w-4 h-4 text-orange-400" />
                            <span>Experience Table 1 Demo</span>
                        </a>
                    </div>

                    {/* Live Demo Quick Bar */}
                    <div className="pt-8 max-w-3xl mx-auto">
                        <div className="p-4 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 backdrop-blur text-left">
                            <div className="flex items-center justify-between mb-3 text-xs">
                                <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                                    <Store className="w-4 h-4 text-orange-400" />
                                    Active Demo Tenant: <span className="text-white font-mono">garnish-annex</span>
                                </span>
                                <span className="text-zinc-400 font-mono text-[11px]">Instant 1-Click Launch</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <a
                                    href="/r/garnish-annex/t/T1"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 transition text-center group"
                                >
                                    <span className="block font-bold text-orange-400 group-hover:text-orange-300">
                                        Guest View
                                    </span>
                                    <span className="text-[10px] text-zinc-400 block mt-0.5">Table T1 QR</span>
                                </a>

                                <a
                                    href="/staff/garnish-annex/floor"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 transition text-center group"
                                >
                                    <span className="block font-bold text-emerald-400 group-hover:text-emerald-300">
                                        Floor Map
                                    </span>
                                    <span className="text-[10px] text-zinc-400 block mt-0.5">PIN: 2222 Waiter</span>
                                </a>

                                <a
                                    href="/staff/garnish-annex/kds"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 transition text-center group"
                                >
                                    <span className="block font-bold text-blue-400 group-hover:text-blue-300">
                                        Station KDS
                                    </span>
                                    <span className="text-[10px] text-zinc-400 block mt-0.5">PIN: 3333 Kitchen</span>
                                </a>

                                <a
                                    href="/admin/garnish-annex"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 transition text-center group"
                                >
                                    <span className="block font-bold text-purple-400 group-hover:text-purple-300">
                                        Owner Portal
                                    </span>
                                    <span className="text-[10px] text-zinc-400 block mt-0.5">PIN: 1111 Owner</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Platform Feature Pillars Grid */}
            <section className="py-16 bg-zinc-900/40 border-y border-zinc-800/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                            Engineered for High-Pace Dine-In Operations
                        </h2>
                        <p className="text-sm text-zinc-400 max-w-2xl mx-auto">
                            Every surface is synchronized in real time using Supabase WebSockets, eliminating table chaos and boosting turnover.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* 1. Shared Table Cart */}
                        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-orange-950/60 border border-orange-800/60 flex items-center justify-center text-orange-400">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-base text-white">
                                Realtime Shared Table Cart
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                4 diners at Table 1 scan with their phones. When Aman adds garlic naan, Priya instantly sees it in the shared drawer with avatar badges, preventing duplicate orders.
                            </p>
                        </div>

                        {/* 2. Prank-Safe Waiter Floor Approval */}
                        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                                <Shield className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-base text-white">
                                Order Approval Gate
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Guest orders enter as PENDING_APPROVAL. The floor waiter verifies the table in 1 tap before sending tickets to the kitchen, stopping accidental or prank orders cold.
                            </p>
                        </div>

                        {/* 3. Station Routed KDS */}
                        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400">
                                <ChefHat className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-base text-white">
                                Station-Routed KDS Board
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Items route to Tandoor, Main Course, and Bar stations independently. Live elapsed timers change color (emerald → amber → red) so expeditors keep prep under control.
                            </p>
                        </div>

                        {/* 4. Split Billing Engine */}
                        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400">
                                <Receipt className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-base text-white">
                                Smart Bill &amp; Split Engine
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Supports Full Bill, Equal Split across 2–10 diners, and itemized By Person split. Diners pay via 1-tap UPI or Razorpay, with customizable tip chips.
                            </p>
                        </div>

                        {/* 5. Google Review Funnel */}
                        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
                                <Star className="w-6 h-6 fill-amber-400" />
                            </div>
                            <h3 className="font-bold text-base text-white">
                                Smart Google Review Funnel
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Intercepts guest feedback at checkout: 4–5 star reviews redirect directly to the restaurant&apos;s Google Review URL; 1–3 star ratings stay private in the Owner Portal.
                            </p>
                        </div>

                        {/* 6. 2-Minute Pitch Cloner */}
                        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-base text-white">
                                2-Minute Pitch Cloner
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Walk into any restaurant. Enter their name and pick a cuisine preset. In 120 seconds, DineOS seeds stations, 30 menu items, tables T1–Tn, and staff PINs for an instant pitch demo.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Architecture Highlights */}
            <section className="py-16">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="p-8 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 space-y-6">
                        <div className="flex items-center gap-2.5 text-xs font-bold text-orange-400 uppercase tracking-wider">
                            <Layers className="w-4 h-4" />
                            <span>Architecture &amp; Reliability</span>
                        </div>

                        <h3 className="text-2xl font-bold text-white">
                            Zero-DNS Multi-Tenancy &amp; Dynamic CSS Tokenization
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-zinc-400">
                            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-1">
                                <strong className="text-white block">Path-Based Isolation</strong>
                                <span>No DNS or subdomain propagation delays. Tenants activate instantly via <code>/r/[slug]</code>.</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-1">
                                <strong className="text-white block">Dynamic Tokens</strong>
                                <span>Injected <code>--brand-primary</code> CSS variables ensure zero hardcoded color classes on guest screens.</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-1">
                                <strong className="text-white block">PIN-Based Auth</strong>
                                <span>1111 Owner, 2222 Waiter, 3333 Kitchen. 48px touch targets for busy kitchen staff.</span>
                            </div>
                        </div>

                        <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800">
                            <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                                <span>Next.js 16 (Turbopack)</span>
                                <span>•</span>
                                <span>Supabase Realtime</span>
                                <span>•</span>
                                <span>Tailwind CSS v4</span>
                            </div>

                            <Link
                                href="/super-admin"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 hover:text-orange-300 transition"
                            >
                                <span>Open Super Admin</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-400">
                <div className="max-w-7xl mx-auto px-4 space-y-2">
                    <p className="font-semibold text-zinc-400">
                        DineOS — The Operating System for Modern Dine-In Restaurants
                    </p>
                    <p className="text-[11px]">
                        Built for instant live demos, multi-table coordination, and frictionless guest checkouts.
                    </p>
                </div>
            </footer>
        </div>
    );
}
