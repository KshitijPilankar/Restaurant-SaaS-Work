'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Delete, ChefHat, Bell, KeyRound } from 'lucide-react';
import { StaffRole } from '@/types/database';
import { verifyStaffPin } from '@/app/staff/[slug]/actions';

interface StaffPinGateProps {
    slug: string;
    restaurantName: string;
    targetRole?: StaffRole;
    surfaceTitle: string; // e.g., 'Floor Captain & Waiter Map' or 'Kitchen Display System (KDS)'
    onSuccess?: () => void;
}

// Public demo PINs. The live URL is the sales demo, so these are shown on purpose.
const DEMO_CREDENTIALS: { pin: string; label: string; role: StaffRole; tone: string }[] = [
    { pin: '1111', label: 'Owner', role: 'OWNER', tone: 'text-amber-300' },
    { pin: '2222', label: 'Waiter', role: 'WAITER', tone: 'text-orange-300' },
    { pin: '3333', label: 'Kitchen', role: 'KITCHEN', tone: 'text-emerald-300' },
];

const KEY_BASE =
    'flex h-16 select-none items-center justify-center rounded-2xl border text-2xl font-bold transition-colors active:scale-95 disabled:opacity-50';

export function StaffPinGate({
    slug,
    restaurantName,
    targetRole,
    surfaceTitle,
    onSuccess,
}: StaffPinGateProps) {
    const router = useRouter();
    const [pin, setPin] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleDigitClick = (digit: string) => {
        if (pin.length < 4) {
            const nextPin = pin + digit;
            setPin(nextPin);
            if (nextPin.length === 4) {
                submitPin(nextPin);
            }
        }
    };

    const handleBackspace = () => {
        setPin((prev) => prev.slice(0, -1));
        setError(null);
    };

    const handleClear = () => {
        setPin('');
        setError(null);
    };

    const submitPin = (pinToSubmit: string) => {
        setError(null);
        startTransition(async () => {
            const res = await verifyStaffPin(slug, pinToSubmit, targetRole);
            if (res.success) {
                if (onSuccess) {
                    onSuccess();
                } else {
                    router.refresh();
                }
            } else {
                setError(res.error || 'Invalid PIN code.');
                setPin('');
            }
        });
    };

    const handleQuickPreset = (presetPin: string) => {
        setPin(presetPin);
        submitPin(presetPin);
    };

    // Highlight the demo PIN that matches this screen (waiter PIN for the floor, kitchen PIN for the KDS)
    const matchingRole: StaffRole = targetRole ?? 'WAITER';

    return (
        <div className="dark flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 text-foreground selection:bg-primary selection:text-primary-foreground">
            <div className="w-full max-w-sm space-y-6 rounded-3xl border border-border bg-card p-6 text-center shadow-2xl sm:p-8">
                {/* Header */}
                <div className="space-y-3">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-border bg-secondary text-primary">
                        {targetRole === 'KITCHEN' ? (
                            <ChefHat aria-hidden="true" className="size-8" />
                        ) : targetRole === 'OWNER' ? (
                            <ShieldCheck aria-hidden="true" className="size-8" />
                        ) : (
                            <Bell aria-hidden="true" className="size-8" />
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <p className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground">
                            <span>{restaurantName}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-primary">{surfaceTitle}</span>
                        </p>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            {targetRole === 'OWNER' ? 'Owner Portal Access' : 'Staff PIN Access'}
                        </h1>
                        <p className="text-base text-muted-foreground">
                            {targetRole === 'OWNER'
                                ? 'Enter your 4-digit Owner PIN to manage menu, view revenue & print QR codes.'
                                : 'Enter your 4-digit PIN to unlock this station.'}
                        </p>
                    </div>
                </div>

                {/* PIN progress (digits are never shown) */}
                <div
                    role="status"
                    aria-label={`${pin.length} of 4 digits entered`}
                    className="flex items-center justify-center gap-4 py-1"
                >
                    {[0, 1, 2, 3].map((idx) => (
                        <span
                            key={idx}
                            aria-hidden="true"
                            className={`size-5 rounded-full border-2 transition-colors ${
                                pin.length > idx ? 'border-primary bg-primary' : 'border-zinc-600 bg-transparent'
                            }`}
                        />
                    ))}
                </div>

                {error && (
                    <div
                        role="alert"
                        className="animate-shake rounded-xl border border-red-500/50 bg-red-950/50 p-3 text-base font-medium text-red-300"
                    >
                        {error}
                    </div>
                )}

                {/* Keypad: 64px keys for gloves and wet hands */}
                <div className="mx-auto grid max-w-[300px] grid-cols-3 gap-3">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                        <button
                            key={digit}
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDigitClick(digit)}
                            className={`${KEY_BASE} border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 active:bg-zinc-600`}
                        >
                            {digit}
                        </button>
                    ))}
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={handleClear}
                        aria-label="Clear PIN"
                        className={`${KEY_BASE} border-zinc-800 bg-zinc-900 text-base font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white`}
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDigitClick('0')}
                        className={`${KEY_BASE} border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 active:bg-zinc-600`}
                    >
                        0
                    </button>
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={handleBackspace}
                        aria-label="Delete last digit"
                        className={`${KEY_BASE} border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white`}
                    >
                        <Delete aria-hidden="true" className="size-6" />
                    </button>
                </div>

                {/* Interactive Demo Credentials (public on purpose: this URL is the sales demo) */}
                <section
                    aria-labelledby="demo-credentials-heading"
                    className="space-y-3 rounded-2xl border border-dashed border-zinc-700 bg-background/60 p-3.5 text-left"
                >
                    <div className="flex items-center gap-2">
                        <KeyRound aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                        <h2 id="demo-credentials-heading" className="text-sm font-semibold text-foreground">
                            Interactive Demo Credentials
                        </h2>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {DEMO_CREDENTIALS.map(({ pin: demoPin, label, role, tone }) => {
                            const isMatch = role === matchingRole;
                            return (
                                <button
                                    key={demoPin}
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => handleQuickPreset(demoPin)}
                                    className={`flex min-h-16 flex-col items-center justify-center rounded-xl border px-2 py-2 transition-colors active:scale-95 disabled:opacity-50 ${
                                        isMatch
                                            ? 'border-primary bg-primary/10 text-foreground'
                                            : 'border-zinc-700 bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700/60'
                                    }`}
                                >
                                    <span className={`font-mono text-lg font-bold tabular-nums ${tone}`}>{demoPin}</span>
                                    <span className="text-sm text-zinc-300">{label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-sm text-muted-foreground">Demo restaurant only. Tap a PIN to sign in instantly.</p>
                </section>
            </div>
        </div>
    );
}
