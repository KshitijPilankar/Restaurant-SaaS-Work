'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Delete, ArrowRight, ChefHat, Bell, KeyRound, Sparkles } from 'lucide-react';
import { StaffRole } from '@/types/database';
import { verifyStaffPin } from '@/app/staff/[slug]/actions';

interface StaffPinGateProps {
    slug: string;
    restaurantName: string;
    targetRole?: StaffRole;
    surfaceTitle: string; // e.g., 'Floor Captain & Waiter Map' or 'Kitchen Display System (KDS)'
    onSuccess?: () => void;
}

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

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 selection:bg-orange-500 selection:text-white">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-sm bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 z-10 text-center">
                {/* Header Info */}
                <div className="space-y-2">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center mx-auto text-orange-400 shadow-md">
                        {targetRole === 'KITCHEN' ? (
                            <ChefHat className="w-7 h-7" />
                        ) : targetRole === 'OWNER' ? (
                            <ShieldCheck className="w-7 h-7 text-amber-400" />
                        ) : (
                            <Bell className="w-7 h-7" />
                        )}
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 mb-1">
                            <span>{restaurantName}</span>
                            <span>•</span>
                            <span className={targetRole === 'OWNER' ? 'text-amber-400' : 'text-orange-400'}>{surfaceTitle}</span>
                        </div>
                        <h1 className="text-xl font-bold text-white tracking-tight">
                            {targetRole === 'OWNER' ? 'Owner Portal Access' : 'Staff PIN Access'}
                        </h1>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            {targetRole === 'OWNER'
                                ? 'Enter your 4-digit Owner PIN to manage menu, view revenue & print QR codes.'
                                : 'Enter your 4-digit PIN on the tablet keypad to unlock this station.'}
                        </p>
                    </div>
                </div>

                {/* 4 PIN Dots */}
                <div className="flex items-center justify-center gap-4 py-2">
                    {[0, 1, 2, 3].map((idx) => {
                        const isFilled = pin.length > idx;
                        return (
                            <div
                                key={idx}
                                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                                    isFilled
                                        ? 'bg-orange-500 border-orange-400 scale-110 shadow-lg shadow-orange-500/50'
                                        : 'border-zinc-700 bg-zinc-950'
                                }`}
                            />
                        );
                    })}
                </div>

                {error && (
                    <div className="p-2.5 bg-red-950/40 border border-red-800/60 rounded-xl text-red-400 text-xs animate-shake">
                        {error}
                    </div>
                )}

                {/* 3x4 Numeric Touch Keypad (min 48px targets for wet/busy kitchen fingers) */}
                <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                        <button
                            key={digit}
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDigitClick(digit)}
                            className="h-14 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 active:bg-zinc-600 border border-zinc-700/60 text-xl font-bold text-white transition cursor-pointer flex items-center justify-center select-none shadow-sm disabled:opacity-50"
                        >
                            {digit}
                        </button>
                    ))}
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={handleClear}
                        className="h-14 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer flex items-center justify-center select-none"
                    >
                        CLEAR
                    </button>
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDigitClick('0')}
                        className="h-14 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 active:bg-zinc-600 border border-zinc-700/60 text-xl font-bold text-white transition cursor-pointer flex items-center justify-center select-none shadow-sm disabled:opacity-50"
                    >
                        0
                    </button>
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={handleBackspace}
                        className="h-14 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer flex items-center justify-center select-none"
                    >
                        <Delete className="w-5 h-5" />
                    </button>
                </div>

                {/* Quick Presets for Demo Pitches */}
                <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                    <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                        Quick Demo PINs
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                        <button
                            type="button"
                            onClick={() => handleQuickPreset('1111')}
                            className={`p-2 rounded-xl border transition text-center ${
                                targetRole === 'OWNER'
                                    ? 'bg-amber-950/60 border-amber-500/80 text-amber-200 ring-1 ring-amber-500/50'
                                    : 'bg-zinc-800/60 hover:bg-zinc-700/60 border-zinc-700/40 text-zinc-300'
                            }`}
                        >
                            <span className="font-mono font-bold block text-amber-400">1111</span>
                            <span className="text-[10px] text-zinc-400 block">Owner</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickPreset('2222')}
                            className="p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/40 text-zinc-300 hover:text-white transition text-center"
                        >
                            <span className="font-mono font-bold block text-orange-400">2222</span>
                            <span className="text-[10px] text-zinc-400 block">Waiter</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickPreset('3333')}
                            className="p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/40 text-zinc-300 hover:text-white transition text-center"
                        >
                            <span className="font-mono font-bold block text-emerald-400">3333</span>
                            <span className="text-[10px] text-zinc-400 block">Kitchen</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
