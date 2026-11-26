import React from 'react';
import Link from 'next/link';

type GateTone = 'neutral' | 'warning' | 'danger';

const TONES: Record<GateTone, { tile: string; heading: string }> = {
    neutral: { tile: 'bg-muted text-muted-foreground', heading: 'text-muted-foreground' },
    warning: { tile: 'bg-amber-100 text-amber-800', heading: 'text-amber-800' },
    danger: { tile: 'bg-red-100 text-red-800', heading: 'text-red-800' },
};

interface TenantGateProps {
    /** Class that provides the display font variable, set by the tenant layout. */
    fontClassName: string;
    icon: React.ReactNode;
    tone?: GateTone;
    /** Main heading, e.g. the restaurant name or "Restaurant Not Found". */
    title: string;
    /** Optional status line under the title, e.g. "Dine-In Orders Temporarily Paused". */
    status?: string;
    children: React.ReactNode;
    /** Show a link back to the DineOS home page. */
    showHomeLink?: boolean;
    /** Tenant brand variables so the card can carry the restaurant's accent. */
    style?: React.CSSProperties;
}

/**
 * Full-screen notice for a restaurant that cannot take orders (not found, paused, demo expired).
 * Uses the same warm alabaster surface as the guest menu, never hard-coded dark colors.
 */
export function TenantGate({
    fontClassName,
    icon,
    tone = 'neutral',
    title,
    status,
    children,
    showHomeLink = false,
    style,
}: TenantGateProps) {
    const t = TONES[tone];

    return (
        <main
            style={style}
            className={`${fontClassName} flex min-h-screen items-center justify-center bg-background p-6 text-foreground selection:bg-brand selection:text-brand-foreground`}
        >
            <div className="w-full max-w-md space-y-5 rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
                <div className={`mx-auto flex size-14 items-center justify-center rounded-2xl ${t.tile}`}>{icon}</div>
                <div className="space-y-2">
                    <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight text-balance">{title}</h1>
                    {status && <h2 className={`text-base font-semibold ${t.heading}`}>{status}</h2>}
                    <div className="text-base leading-relaxed text-pretty text-muted-foreground">{children}</div>
                </div>
                {showHomeLink && (
                    <Link
                        href="/"
                        className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-background px-5 text-base font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                        Back to DineOS
                    </Link>
                )}
            </div>
        </main>
    );
}
