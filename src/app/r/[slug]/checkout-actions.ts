'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { PaymentMethod, PaymentStatus } from '@/types/database';

export interface ActionResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface RecordPaymentInput {
    restaurantId: string;
    tableId: string;
    sessionId: string;
    paidByName: string;
    subtotal: number;
    taxAmount: number;
    tipAmount: number;
    totalAmount: number;
    method: PaymentMethod;
    razorpayOrderId?: string | null;
    razorpayPaymentId?: string | null;
}

export interface SubmitReviewInput {
    restaurantId: string;
    sessionId?: string | null;
    guestName: string;
    rating: number; // 1 to 5
    comment?: string | null;
    redirectedToGoogle: boolean;
}

/**
 * 1. Record Table Payment:
 * Inserts a payment record, updates table status to 'BILL',
 * and records a service request so floor staff sees the table has paid / requested settlement.
 */
export async function recordTablePayment(
    input: RecordPaymentInput
): Promise<ActionResult<{ paymentId: string }>> {
    // 1. Insert into payments
    const { data: payment, error: payErr } = await supabaseAdmin
        .from('payments')
        .insert({
            restaurant_id: input.restaurantId,
            session_id: input.sessionId,
            paid_by_name: input.paidByName || 'Guest',
            subtotal: input.subtotal,
            tax_amount: input.taxAmount,
            tip_amount: input.tipAmount || 0,
            total_amount: input.totalAmount,
            method: input.method,
            status: 'PAID' as PaymentStatus,
            razorpay_order_id: input.razorpayOrderId || null,
            razorpay_payment_id: input.razorpayPaymentId || null,
        })
        .select('id')
        .single();

    if (payErr || !payment) {
        return { success: false, error: payErr?.message || 'Failed to record payment.' };
    }

    // 2. Update table status to 'BILL'
    await supabaseAdmin
        .from('tables')
        .update({ status: 'BILL' })
        .eq('id', input.tableId)
        .eq('restaurant_id', input.restaurantId);

    // 3. Insert service request of type 'BILL' so staff gets an alert on floor map
    await supabaseAdmin
        .from('service_requests')
        .insert({
            restaurant_id: input.restaurantId,
            table_id: input.tableId,
            session_id: input.sessionId,
            type: 'BILL',
            status: 'OPEN',
        });

    return { success: true, data: { paymentId: payment.id } };
}

/**
 * 2. Submit Guest Review:
 * Inserts into reviews table.
 * If 4-5 stars: flagged with redirected_to_google: true.
 * If 1-3 stars: captures private constructive feedback for owner.
 */
export async function submitGuestReview(
    input: SubmitReviewInput
): Promise<ActionResult> {
    const rating = Math.min(Math.max(Number(input.rating) || 5, 1), 5);

    const { error } = await supabaseAdmin
        .from('reviews')
        .insert({
            restaurant_id: input.restaurantId,
            session_id: input.sessionId || null,
            guest_name: input.guestName || 'Anonymous',
            rating,
            comment: input.comment?.trim() || null,
            redirected_to_google: !!input.redirectedToGoogle,
        });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}
