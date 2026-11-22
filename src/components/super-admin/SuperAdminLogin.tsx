'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { verifySuperAdminPasskey } from '@/app/super-admin/actions';

export function SuperAdminLogin() {
    const router = useRouter();
    const [passkey, setPasskey] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!passkey.trim()) {
            setError('Please enter the master passkey.');
            return;
        }

        startTransition(async () => {
            const res = await verifySuperAdminPasskey(passkey);
            if (res.success) {
                router.refresh();
            } else {
                setError(res.error || 'Authentication failed. Please check the passkey.');
            }
        });
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 selection:bg-orange-500 selection:text-white">
            {/* Ambient background glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-md bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl rounded-2xl shadow-2xl p-8 z-10">
                <div className="flex flex-col items-center text-center space-y-3 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-600/25 ring-4 ring-orange-500/10">
                        <ShieldCheck className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-1">
                            <Sparkles className="w-3 h-3" /> DineOS Control Room
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">Super Admin Access</h1>
                        <p className="text-sm text-zinc-400 mt-1">
                            Enter the master passkey to manage restaurant tenants and provision live demo pitches.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="passkey" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                            Master Passkey
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                                <Lock className="w-4 h-4" />
                            </div>
                            <input
                                id="passkey"
                                type="password"
                                value={passkey}
                                onChange={(e) => setPasskey(e.target.value)}
                                placeholder="••••••••••••••••"
                                autoFocus
                                required
                                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm font-mono"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-950/40 border border-red-800/60 rounded-xl animate-shake">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-[0.99] transition-all duration-150 shadow-lg shadow-orange-600/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                        {isPending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                <span>Authenticating...</span>
                            </>
                        ) : (
                            <>
                                <span>Unlock Control Room</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-zinc-800/80 text-center">
                    <p className="text-xs text-zinc-400">
                        Configured via <code className="text-zinc-400 bg-zinc-800/60 px-1 py-0.5 rounded text-[11px]">SUPER_ADMIN_PASSKEY</code> in your environment.
                    </p>
                </div>
            </div>
        </div>
    );
}
