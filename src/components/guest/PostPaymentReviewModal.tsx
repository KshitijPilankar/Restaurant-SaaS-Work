'use client';

import React, { useState, useTransition } from 'react';
import { Star, Sparkles, ExternalLink, Check, X, Heart } from 'lucide-react';
import { Restaurant } from '@/types/database';
import { submitGuestReview } from '@/app/r/[slug]/checkout-actions';
import { BottomSheet } from '@/components/ui/bottom-sheet';

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

    const isHighRating = rating >= 4;

    const rawGoogleUrl = restaurant.google_review_url?.trim();
    const safeGoogleUrl =
        rawGoogleUrl && rawGoogleUrl.startsWith('https://')
            ? rawGoogleUrl
            : `https://www.google.com/search?q=${encodeURIComponent(restaurant.name + ' restaurant reviews')}`;

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
            window.open(safeGoogleUrl, '_blank', 'noopener,noreferrer');
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
        <BottomSheet
            open={isOpen}
            onClose={onClose}
            label="Rate your visit"
            placement="adaptive"
            className="max-w-sm"
            contentClassName="px-6 pb-6 pt-1 sm:pt-6 space-y-5 text-center"
            zIndexClassName="z-60"
            backdropClassName="bg-black/70 backdrop-blur-sm"
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close review modal"
            >
                <X aria-hidden="true" className="size-5" />
            </button>

            {isSubmitted ? (
                <div role="status" className="animate-fadeIn space-y-3 py-6">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-lg ring-1 ring-black/5">
                        <Check aria-hidden="true" className="size-7 stroke-[3]" />
                    </div>
                    <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">Thank You!</h2>
                    <p className="text-sm text-muted-foreground">
                        Your feedback helps us keep improving our food &amp; hospitality.
                    </p>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="space-y-1.5">
                        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-md ring-1 ring-black/5">
                            <Heart aria-hidden="true" className="size-6 fill-current" />
                        </div>
                        <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            How was your dining experience?
                        </p>
                        <h2 className="font-display text-2xl leading-tight font-semibold tracking-tight text-balance text-foreground">
                            Rate {restaurant.name}
                        </h2>
                    </div>

                    {/* 5-star rating */}
                    <div role="group" aria-label="Your rating" className="flex items-center justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                            const isFilled = star <= rating;
                            return (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    aria-pressed={star === rating}
                                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                                    className="flex size-11 items-center justify-center rounded-full transition-transform active:scale-90"
                                >
                                    <Star
                                        aria-hidden="true"
                                        className={`size-8 transition-colors ${
                                            isFilled ? 'fill-amber-400 text-amber-500' : 'text-zinc-300 hover:text-amber-300'
                                        }`}
                                    />
                                </button>
                            );
                        })}
                    </div>

                    {/* Smart review branch */}
                    {isHighRating ? (
                        /* 4 or 5 stars: Google review funnel */
                        <div className="animate-fadeIn space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-left">
                            <div className="flex items-start gap-2.5">
                                <Sparkles aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700" />
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">We&apos;re thrilled you enjoyed it!</h3>
                                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                        Would you mind taking 10 seconds to share your positive experience on Google? It means the
                                        world to our team.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleRedirect}
                                disabled={isPending}
                                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-brand-foreground shadow-md transition-transform active:scale-[0.98] disabled:opacity-60"
                            >
                                <ExternalLink aria-hidden="true" className="size-4" />
                                <span>Share on Google Reviews</span>
                            </button>
                        </div>
                    ) : (
                        /* 1 to 3 stars: private feedback form */
                        <form onSubmit={handlePrivateFeedbackSubmit} className="animate-fadeIn space-y-3 text-left">
                            <div className="space-y-1 rounded-xl border border-border bg-muted/50 p-3">
                                <h3 className="text-sm font-semibold text-foreground">We strive for perfection.</h3>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Tell us what went wrong so the restaurant owner can address it right away.
                                </p>
                            </div>

                            <label htmlFor="review-comment" className="sr-only">
                                What can we improve?
                            </label>
                            <textarea
                                id="review-comment"
                                name="comment"
                                autoComplete="off"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Tell the management what we can improve…"
                                rows={3}
                                required
                                className="w-full resize-none rounded-xl border border-border bg-muted/40 p-3 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
                            />

                            <button
                                type="submit"
                                disabled={isPending}
                                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-foreground px-4 text-sm font-bold text-background shadow-xs transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                            >
                                {isPending ? 'Sending…' : 'Send Private Feedback to Owner'}
                            </button>
                        </form>
                    )}
                </>
            )}
        </BottomSheet>
    );
}
