import React from 'react';
import { Fraunces } from 'next/font/google';
import { AlertCircle, Clock, UtensilsCrossed } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Restaurant } from '@/types/database';
import { getBrandCssVars } from '@/lib/brand';
import { TenantGate } from '@/components/guest/TenantGate';

// Serif display face for guest headings (restaurant name, categories, dish names).
// Loaded here, not in the root layout, so staff, admin and landing pages never download it.
const fraunces = Fraunces({
    subsets: ['latin'],
    variable: '--font-fraunces',
    display: 'swap',
});

interface TenantLayoutProps {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
    const { slug } = await params;

    const { data: restaurant, error } = await supabaseAdmin
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

    if (error || !restaurant) {
        return (
            <TenantGate
                fontClassName={fraunces.variable}
                icon={<UtensilsCrossed aria-hidden="true" className="size-7" />}
                title="Restaurant Not Found"
                showHomeLink
            >
                <p>
                    There is no restaurant at{' '}
                    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">/r/{slug}</code>. Check the
                    QR code or link and try again.
                </p>
            </TenantGate>
        );
    }

    const rest = restaurant as Restaurant;

    // Dynamic white-label tokens (--brand-primary plus readable foreground and subtle tint)
    const brandVars = getBrandCssVars(rest.primary_color);

    // Guard 1: Status PAUSED
    if (rest.status === 'PAUSED') {
        return (
            <TenantGate
                fontClassName={fraunces.variable}
                style={brandVars as React.CSSProperties}
                icon={<AlertCircle aria-hidden="true" className="size-7" />}
                tone="warning"
                title={rest.name}
                status="Dine-In Orders Temporarily Paused"
            >
                <p>This restaurant is not taking digital table orders right now. Please ask your floor server for help.</p>
            </TenantGate>
        );
    }

    // Guard 2: DEMO Expiry Check
    if (rest.status === 'DEMO' && rest.demo_expires_at) {
        const isExpired = new Date(rest.demo_expires_at).getTime() < Date.now();
        if (isExpired) {
            return (
                <TenantGate
                    fontClassName={fraunces.variable}
                    style={brandVars as React.CSSProperties}
                    icon={<Clock aria-hidden="true" className="size-7" />}
                    tone="danger"
                    title={rest.name}
                    status="Demo Period Expired"
                >
                    <p>This 7-day sales demo has ended. Contact your DineOS sales representative to activate this restaurant.</p>
                </TenantGate>
            );
        }
    }

    return (
        <div
            className={`${fraunces.variable} min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-brand-foreground`}
            style={brandVars as React.CSSProperties}
        >
            {children}
        </div>
    );
}
