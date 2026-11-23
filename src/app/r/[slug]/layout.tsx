import React from 'react';
import { notFound } from 'next/navigation';
import { AlertCircle, Clock, UtensilsCrossed } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Restaurant } from '@/types/database';

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
            <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                        <UtensilsCrossed className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Restaurant Not Found</h1>
                        <p className="text-xs text-zinc-400 mt-1">
                            The restaurant slug <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-orange-400 font-mono">/r/{slug}</code> does not exist on DineOS.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const rest = restaurant as Restaurant;

    // Guard 1: Status PAUSED
    if (rest.status === 'PAUSED') {
        return (
            <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">{rest.name}</h1>
                        <h2 className="text-sm font-semibold text-amber-400 mt-1">Dine-In Orders Temporarily Paused</h2>
                        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                            This restaurant is currently not accepting digital table orders. Please contact your floor server for assistance.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Guard 2: DEMO Expiry Check
    if (rest.status === 'DEMO' && rest.demo_expires_at) {
        const isExpired = new Date(rest.demo_expires_at).getTime() < Date.now();
        if (isExpired) {
            return (
                <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
                        <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto">
                            <Clock className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">{rest.name}</h1>
                            <h2 className="text-sm font-semibold text-red-400 mt-1">Demo Period Expired</h2>
                            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                                This 7-day sales demo has concluded. Contact your DineOS sales representative to activate this restaurant.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }
    }

    // Dynamic White-Label Token Injection
    const brandPrimary = rest.primary_color || '#EA580C';

    return (
        <div
            className="min-h-screen bg-background text-foreground font-sans selection:bg-orange-500 selection:text-white"
            style={{ '--brand-primary': brandPrimary } as React.CSSProperties}
        >
            {children}
        </div>
    );
}
