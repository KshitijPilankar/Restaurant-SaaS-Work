import React from 'react';
import Link from 'next/link';
import { Fraunces } from 'next/font/google';
import {
    QrCode,
    Users,
    ShieldCheck,
    ChefHat,
    Receipt,
    Star,
    Zap,
    ArrowRight,
    Smartphone,
    KeyRound,
    Clock,
    Flame,
    ShoppingBag,
    Leaf,
} from 'lucide-react';

// Serif display face for headings; the same one the guest menu uses.
const fraunces = Fraunces({
    subsets: ['latin'],
    variable: '--font-fraunces',
    display: 'swap',
});

const DEMO_SLUG = 'garnish-annex';

const STEPS = [
    {
        Icon: QrCode,
        title: 'Guests scan the table QR',
        body: 'No app to download. Everyone at the table opens your branded menu and adds dishes to one shared cart.',
    },
    {
        Icon: ShieldCheck,
        title: 'Your waiter approves',
        body: 'Each order waits for one tap from floor staff, so a prank or a mistaken order never reaches the kitchen.',
    },
    {
        Icon: ChefHat,
        title: 'The kitchen cooks, guests pay',
        body: 'Tickets reach the right station with a live timer. Guests split the bill and pay by UPI or card at the table.',
    },
];

const BENEFITS = [
    {
        Icon: Users,
        title: 'One shared table cart',
        body: 'Four friends order from four phones into one cart. Nobody orders the same naan twice.',
    },
    {
        Icon: Clock,
        title: 'Faster tables, calmer floor',
        body: 'Orders, service calls and bills arrive on the floor map, so staff stop walking back and forth.',
    },
    {
        Icon: Receipt,
        title: 'Split bills in seconds',
        body: 'Pay the full bill, split it equally, or let each person pay for their own dishes.',
    },
    {
        Icon: Star,
        title: 'More five-star reviews',
        body: 'Happy guests are sent to your Google reviews. Unhappy ones tell you privately first.',
    },
    {
        Icon: Smartphone,
        title: 'Your brand, not ours',
        body: 'Your name, logo and colour on every guest screen. Live the moment you set it up.',
    },
    {
        Icon: Zap,
        title: 'A demo in two minutes',
        body: 'Enter a restaurant name, pick a cuisine, and get a full working demo to show the owner.',
    },
];

const DEMO_LINKS = [
    { href: `/r/${DEMO_SLUG}/t/T1`, title: 'Guest menu', note: 'What diners see on their phone' },
    { href: `/staff/${DEMO_SLUG}/floor`, title: 'Floor map', note: 'Approve orders, answer calls' },
    { href: `/staff/${DEMO_SLUG}/kds`, title: 'Kitchen display', note: 'Tickets with live timers' },
    { href: `/admin/${DEMO_SLUG}`, title: 'Owner portal', note: 'Menu, tables, QR codes' },
];

const DEMO_PINS = [
    { pin: '1111', role: 'Owner' },
    { pin: '2222', role: 'Waiter' },
    { pin: '3333', role: 'Kitchen' },
];

/** Decorative preview of the guest menu on a phone. */
function PhonePreview() {
    return (
        <div
            role="img"
            aria-label="Preview of the guest QR menu: a menu with a shared table cart"
            className="relative mx-auto w-[240px] shrink-0 rounded-[2.25rem] border-[6px] border-zinc-900 bg-background shadow-2xl sm:w-[240px]"
        >
            <div className="space-y-3 overflow-hidden rounded-[1.75rem] p-3 pt-4">
                <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-brand font-display text-sm font-semibold text-brand-foreground">
                        G
                    </div>
                    <div>
                        <p className="font-display text-sm leading-tight font-semibold text-foreground">Garnish Annex</p>
                        <p className="text-xs text-muted-foreground">T1 · Hi, Priya</p>
                    </div>
                </div>

                <div className="flex gap-1.5">
                    <span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground">All Items</span>
                    <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground">Starters</span>
                    <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground">Mains</span>
                </div>

                {[
                    { name: 'Paneer Tikka Angara', price: '₹280', veg: true, best: true },
                    { name: 'Murgh Malai Kebab', price: '₹340', veg: false, best: false },
                ].map((d) => (
                    <div key={d.name} className="flex items-start gap-2.5 rounded-2xl border border-border bg-card p-2.5 shadow-xs">
                        <div className="min-w-0 flex-1 space-y-1">
                            <p className="flex items-center gap-1.5 text-xs">
                                <span
                                    className={`flex size-3.5 items-center justify-center rounded-[3px] border-2 ${
                                        d.veg ? 'border-emerald-700' : 'border-red-700'
                                    }`}
                                >
                                    <span className={`size-1.5 rounded-full ${d.veg ? 'bg-emerald-700' : 'bg-red-700'}`} />
                                </span>
                                {d.best && (
                                    <span className="inline-flex items-center gap-0.5 font-semibold text-amber-800">
                                        <Star className="size-3 fill-current" />
                                        Bestseller
                                    </span>
                                )}
                            </p>
                            <p className="font-display text-sm leading-snug font-semibold text-foreground">{d.name}</p>
                            <p className="font-mono text-sm font-bold text-foreground">{d.price}</p>
                        </div>
                        <div className="flex w-14 flex-col items-center">
                            <div className="size-14 rounded-xl bg-brand-subtle" />
                            <span className="-mt-3 rounded-full border-2 border-brand bg-card px-3 py-0.5 text-xs font-bold text-foreground ring-2 ring-card">
                                Add
                            </span>
                        </div>
                    </div>
                ))}

                <div className="flex items-center justify-between rounded-2xl bg-brand px-3 py-2 text-brand-foreground">
                    <span className="flex items-center gap-2 text-xs font-bold">
                        <ShoppingBag className="size-4" />
                        Shared Table Cart
                    </span>
                    <span className="font-mono text-xs font-bold">₹620</span>
                </div>
            </div>
        </div>
    );
}

/** Decorative preview of a kitchen ticket with its live timer. */
function KdsPreview() {
    return (
        <div
            role="img"
            aria-label="Preview of a kitchen display ticket for table 4, twelve minutes elapsed"
            className="w-[240px] shrink-0 space-y-3 rounded-2xl border-4 border-amber-400 bg-zinc-900 p-3.5 text-zinc-100 shadow-2xl sm:w-[250px]"
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="inline-block rounded-lg border border-zinc-600 bg-zinc-800 px-2.5 py-0.5 font-mono text-xl font-black text-white">
                        T4
                    </p>
                    <p className="mt-1 text-sm text-zinc-300">Table 4</p>
                </div>
                <div className="text-right text-amber-300">
                    <p className="flex items-baseline justify-end gap-1">
                        <span className="font-mono text-5xl leading-none font-black">12</span>
                        <span className="text-base font-bold">min</span>
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold">
                        <Clock className="size-3.5" />
                        Getting late
                    </p>
                </div>
            </div>
            <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950 text-sm">
                <li className="flex items-center justify-between gap-2 px-2.5 py-2">
                    <span>
                        <span className="font-mono font-black text-white">2×</span> Paneer Tikka Angara
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/60 bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-200 uppercase">
                        <Flame className="size-3" />
                        Cooking
                    </span>
                </li>
                <li className="flex items-center justify-between gap-2 px-2.5 py-2">
                    <span>
                        <span className="font-mono font-black text-white">1×</span> Garlic Naan
                    </span>
                    <span className="rounded-md border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-xs font-bold text-zinc-200 uppercase">
                        Queued
                    </span>
                </li>
            </ul>
            <p className="rounded-xl bg-emerald-700 py-2.5 text-center text-sm font-bold text-white">Bump Entire Order Ready</p>
        </div>
    );
}

export default function HomePage() {
    return (
        <div className={`${fraunces.variable} min-h-screen overflow-x-clip bg-background text-foreground selection:bg-brand selection:text-brand-foreground`}>
            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
                    <Link href="/" className="flex min-h-11 items-center gap-2.5" aria-label="DineOS home">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                            <QrCode aria-hidden="true" className="size-5" />
                        </span>
                        <span className="font-display text-xl font-semibold tracking-tight">DineOS</span>
                    </Link>

                    <nav aria-label="Main" className="flex items-center gap-1 sm:gap-3">
                        <a href="#how" className="hidden min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex">
                            How it works
                        </a>
                        <Link
                            href="/super-admin"
                            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                            Super Admin
                        </Link>
                        <Link
                            href={`/r/${DEMO_SLUG}/t/T1`}
                            className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-sm font-bold text-brand-foreground shadow-xs transition-transform active:scale-95"
                        >
                            Try the Live Demo
                        </Link>
                    </nav>
                </div>
            </header>

            <main>
                {/* Hero */}
                <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:pb-24">
                    <div className="space-y-6">
                        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm font-semibold text-muted-foreground">
                            <Leaf aria-hidden="true" className="size-4 text-emerald-700" />
                            For restaurants, cafés and lounges
                        </p>
                        <h1 className="font-display text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
                            Every table orders, calls and pays from one QR code.
                        </h1>
                        <p className="max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
                            Guests order together from their own phones with no app to download. Your waiters approve in one
                            tap, your kitchen sees live tickets, and the bill splits itself.
                        </p>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <Link
                                href={`/r/${DEMO_SLUG}/t/T1`}
                                className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-brand px-7 text-base font-bold text-brand-foreground shadow-lg transition-transform active:scale-95"
                            >
                                <span>Try the Live Demo</span>
                                <ArrowRight aria-hidden="true" className="size-5" />
                            </Link>
                            <a
                                href="#how"
                                className="inline-flex min-h-14 items-center rounded-2xl border border-border bg-card px-6 text-base font-semibold text-foreground transition-colors hover:bg-muted"
                            >
                                See how it works
                            </a>
                        </div>
                        <p className="text-sm text-muted-foreground">Opens a real demo restaurant. No sign-up needed.</p>
                    </div>

                    {/* Product preview: guest menu and kitchen ticket */}
                    <div className="relative flex items-center justify-center py-4">
                        <div aria-hidden="true" className="absolute inset-x-6 top-6 bottom-6 rounded-[3rem] bg-brand-subtle" />
                        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:gap-4">
                            <PhonePreview />
                            <div className="sm:mb-6">
                                <KdsPreview />
                            </div>
                        </div>
                    </div>
                </section>

                {/* How it works */}
                <section id="how" className="scroll-mt-20 border-y border-border bg-card">
                    <div className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6">
                        <div className="max-w-2xl space-y-2">
                            <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                                From scan to paid, without the shouting across the room
                            </h2>
                            <p className="text-base text-muted-foreground">Three steps, and every screen updates live.</p>
                        </div>
                        <ol className="grid gap-5 md:grid-cols-3">
                            {STEPS.map(({ Icon, title, body }, i) => (
                                <li key={title} className="space-y-3 rounded-2xl border border-border bg-background p-6">
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-11 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                                            <Icon aria-hidden="true" className="size-5" />
                                        </span>
                                        <span className="font-mono text-sm font-bold text-muted-foreground">Step {i + 1}</span>
                                    </div>
                                    <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
                                    <p className="text-base leading-relaxed text-muted-foreground">{body}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* Owner benefits */}
                <section className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6">
                    <div className="max-w-2xl space-y-2">
                        <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                            Built for the way a busy dining room actually runs
                        </h2>
                    </div>
                    <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                        {BENEFITS.map(({ Icon, title, body }) => (
                            <li key={title} className="flex gap-4">
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground">
                                    <Icon aria-hidden="true" className="size-5" />
                                </span>
                                <div className="space-y-1">
                                    <h3 className="text-base font-semibold text-foreground">{title}</h3>
                                    <p className="text-base leading-relaxed text-muted-foreground">{body}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Live demo + credentials */}
                <section id="demo" className="scroll-mt-20 border-t border-border bg-card">
                    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                                    Try every screen yourself
                                </h2>
                                <p className="text-base text-muted-foreground">
                                    This is a real demo restaurant. Order as a guest, then switch to the floor and kitchen and
                                    watch it arrive.
                                </p>
                            </div>
                            <ul className="grid gap-3 sm:grid-cols-2">
                                {DEMO_LINKS.map((l) => (
                                    <li key={l.href}>
                                        <Link
                                            href={l.href}
                                            className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4 transition-colors hover:border-foreground/30"
                                        >
                                            <span>
                                                <span className="block text-base font-semibold text-foreground">{l.title}</span>
                                                <span className="block text-sm text-muted-foreground">{l.note}</span>
                                            </span>
                                            <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <aside
                            aria-labelledby="demo-credentials"
                            className="space-y-4 self-start rounded-2xl border border-dashed border-foreground/25 bg-background p-5"
                        >
                            <div className="flex items-center gap-2">
                                <KeyRound aria-hidden="true" className="size-4 text-muted-foreground" />
                                <h3 id="demo-credentials" className="text-sm font-semibold text-foreground">
                                    Interactive Demo Credentials
                                </h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                The floor, kitchen and owner screens ask for a PIN. Use these on the demo restaurant.
                            </p>
                            <dl className="grid grid-cols-3 gap-2">
                                {DEMO_PINS.map(({ pin, role }) => (
                                    <div key={pin} className="rounded-xl border border-border bg-card px-2 py-3 text-center">
                                        <dd className="font-mono text-xl font-bold text-foreground tabular-nums">{pin}</dd>
                                        <dt className="text-sm text-muted-foreground">{role}</dt>
                                    </div>
                                ))}
                            </dl>
                            <p className="text-sm text-muted-foreground">Demo restaurant only. Your own restaurant gets private PINs.</p>
                        </aside>
                    </div>
                </section>

                {/* Closing call to action */}
                <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
                    <div className="mx-auto max-w-2xl space-y-5">
                        <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                            See it work on a real table in under a minute
                        </h2>
                        <Link
                            href={`/r/${DEMO_SLUG}/t/T1`}
                            className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-brand px-7 text-base font-bold text-brand-foreground shadow-lg transition-transform active:scale-95"
                        >
                            <span>Try the Live Demo</span>
                            <ArrowRight aria-hidden="true" className="size-5" />
                        </Link>
                    </div>
                </section>
            </main>

            <footer className="border-t border-border">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:px-6">
                    <p>DineOS · The operating system for dine-in restaurants</p>
                    <Link href="/super-admin" className="inline-flex min-h-11 items-center font-medium hover:text-foreground">
                        Super Admin login
                    </Link>
                </div>
            </footer>
        </div>
    );
}
