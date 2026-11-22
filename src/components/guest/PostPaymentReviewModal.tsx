'use client';

import React, { useState, useTransition } from 'react';
import { Star, Sparkles, ExternalLink, MessageSquare, Check, X, Heart } from 'lucide-react';
import { Restaurant } from '@/types/database';
import { submitGuestReview } from '@/app/r/[slug]/checkout-actions';

interface PostPaymentReviewModalProps {
    restaurant: Restaurant;
    sessionId: string;
    guestName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function PostPaymentReviewModal({
    restaurant,
    sessionId,
    guestName,
    isOpen,
    onClose,
}: PostPaymentReviewModalProps) {
    const [rating, setRating] = useState<number>(5);
    const [comment, setComment] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isPending, startTransition] = useTransition();

    if (!isOpen) return null;

    const isHighRating = rating >= 4;

    const googleUrl =
        restaurant.google_review_url ||
        `https://www.google.com/search?q=${encodeURIComponent(restaurant.name + ' restaurant reviews')}`;

    const handleGoogleRedirect = () => {
        startTransition(async () => {
            await submitGuestReview({
                restaurantId: restaurant.id,
                sessionId,
                guestName: guestName || 'Guest',
                rating,
                comment: null,
                redirectedToGoogle: true,
            });
            window.open(googleUrl, '_blank', 'noopener,noreferrer');
            setIsSubmitted(true);
            setTimeout(() => {
                onClose();
            }, 1200);
        });
    };

    const handlePrivateFeedbackSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            await submitGuestReview({
                restaurantId: restaurant.id,
                sessionId,
                guestName: guestName || 'Guest',
                rating,
                comment,
                redirectedToGoogle: false,
            });
            setIsSubmitted(true);
            setTimeout(() => {
                onClose();
            }, 1600);
        });
    };

    return (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
            <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5 animate-slideUp relative text-center">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-zinc-600 rounded-full"
                >
                    <X className="w-5 h-5" />
                </button>

                {isSubmitted ? (
                    <div className="py-6 space-y-3 animate-fadeIn">
                        <div
                            className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg"
                            style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                            <Check className="w-7 h-7 stroke-[3]" />
                        </div>
                        <h3 className="text-lg font-bold text-zinc-900">Thank You!</h3>
                        <p className="text-xs text-zinc-500">
                            Your feedback helps us continuously elevate our food & hospitality.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="space-y-1.5">
                            <div
                                className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md mb-2"
                                style={{ backgroundColor: 'var(--brand-primary)' }}
                            >
                                <Heart className="w-6 h-6 fill-white" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                How was your dining experience?
                            </span>
                            <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
                                Rate {restaurant.name}
                            </h3>
                        </div>

                        {/* Interactive 5-Star Row */}
                        <div className="flex items-center justify-center gap-2 py-1">
                            {[1, 2, 3, 4, 5].map((star) => {
                                const isFilled = star <= rating;
                                return (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className="p-1 hover:scale-125 transition cursor-pointer"
                                    >
                                        <Star
                                            className={`w-8 h-8 transition ${
                                                isFilled
                                                    ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                                                    : 'text-zinc-300 hover:text-amber-200'
                                            }`}
                                        />
                                    </button>
                                );
                            })}
                        </div>

                        {/* Smart Review Branch */}
                        {isHighRating ? (
                            /* 4 or 5 Stars: Celebratory Google Review Funnel */
                            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3 animate-fadeIn text-left">
                                <div className="flex items-start gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-xs font-bold text-amber-950">
                                            We&apos;re thrilled you enjoyed it!
                                        </h4>
                                        <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                                            Would you mind taking 10 seconds to share your positive experience on Google? It means the world to our team.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGoogleRedirect}
                                    disabled={isPending}
                                    className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white shadow-md active:scale-[0.99] transition flex items-center justify-center gap-1.5 cursor-pointer"
                                    style={{ backgroundColor: 'var(--brand-primary)' }}
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Share on Google Reviews</span>
                                </button>
                            </div>
                        ) : (
                            /* 1, 2 or 3 Stars: Private Constructive Feedback Form */
                            <form onSubmit={handlePrivateFeedbackSubmit} className="space-y-3 animate-fadeIn text-left">
                                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
                                    <h4 className="text-xs font-bold text-zinc-900">
                                        We strive for perfection.
                                    </h4>
                                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                                        Please tell us what went wrong so the restaurant owner can address it immediately.
                                    </p>
                                </div>

                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Tell the management what we can improve..."
                                    rows={3}
                                    required
                                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:bg-white resize-none"
                                />

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-zinc-900 text-white hover:bg-zinc-800 transition shadow cursor-pointer disabled:opacity-50"
                                >
                                    {isPending ? 'Sending...' : 'Send Private Feedback to Owner'}
                                </button>
                            </form>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
