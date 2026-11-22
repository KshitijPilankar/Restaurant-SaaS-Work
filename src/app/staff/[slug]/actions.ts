'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/server';
import { StaffRole, ItemPrepStatus, OrderStatus, TableStatus } from '@/types/database';

export interface ActionResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface StaffSessionData {
    staffId: string;
    name: string;
    role: StaffRole;
    restaurantId: string;
    restaurantSlug: string;
}

// In-memory PIN rate limiting tracking map (per restaurant slug)
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15-minute lockout
const pinRateLimitMap = new Map<string, { attempts: number; lockedUntil: number }>();

/**
 * 1. Verify 4-digit Staff PIN & establish HTTP-only session cookie (12-hour expiry)
 * Includes brute-force protection with 5 attempts max per 15 minutes.
 */
export async function verifyStaffPin(
    slug: string,
    pinCode: string,
    requiredRole?: StaffRole
): Promise<ActionResult<{ staff: { id: string; name: string; role: StaffRole } }>> {
    const trimmedPin = pinCode.trim();
    if (trimmedPin.length !== 4) {
        return { success: false, error: 'Please enter a 4-digit PIN.' };
    }

    // Check rate limit lockout
    const rateLimitKey = slug.toLowerCase();
    const currentRate = pinRateLimitMap.get(rateLimitKey);
    const now = Date.now();

    if (currentRate && currentRate.lockedUntil > now) {
        const remainingMins = Math.ceil((currentRate.lockedUntil - now) / 60000);
        return {
            success: false,
            error: `Too many failed attempts. PIN entry is locked for ${remainingMins} more minute(s).`,
        };
    }

    // 1. Fetch restaurant by slug
    const { data: restaurant, error: restErr } = await supabaseAdmin
        .from('restaurants')
        .select('id, slug')
        .eq('slug', slug)
        .maybeSingle();

    if (restErr || !restaurant) {
        return { success: false, error: 'Restaurant not found.' };
    }

    // 2. Fetch staff user matching pin and restaurant_id
    const { data: staff, error: staffErr } = await supabaseAdmin
        .from('staff_users')
        .select('id, name, role, is_active')
        .eq('restaurant_id', restaurant.id)
        .eq('pin_code', trimmedPin)
        .eq('is_active', true)
        .maybeSingle();

    if (staffErr || !staff) {
        const record = currentRate && currentRate.lockedUntil <= now
            ? { attempts: 1, lockedUntil: 0 }
            : { attempts: (currentRate?.attempts || 0) + 1, lockedUntil: 0 };

        if (record.attempts >= PIN_MAX_ATTEMPTS) {
            record.lockedUntil = now + PIN_LOCKOUT_MS;
            pinRateLimitMap.set(rateLimitKey, record);
            return {
                success: false,
                error: 'Too many failed PIN attempts. PIN entry is locked for 15 minutes.',
            };
        }

        pinRateLimitMap.set(rateLimitKey, record);
        const remaining = PIN_MAX_ATTEMPTS - record.attempts;
        return {
            success: false,
            error: `Invalid PIN. ${remaining} attempt(s) remaining before 15-minute lockout.`,
        };
    }

    // If a specific role is required (e.g. OWNER), enforce it
    if (requiredRole && staff.role !== requiredRole && staff.role !== 'OWNER') {
        return { success: false, error: `Access denied. ${requiredRole} PIN required for this portal.` };
    }

    // Clear rate limit on successful PIN
    pinRateLimitMap.delete(rateLimitKey);

    const sessionPayload: StaffSessionData = {
        staffId: staff.id,
        name: staff.name,
        role: staff.role as StaffRole,
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug,
    };

    const cookieStore = await cookies();
    cookieStore.set(`dineos_staff_${slug}`, JSON.stringify(sessionPayload), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 12 * 60 * 60, // 12 hours
        path: '/',
    });

    return {
        success: true,
        data: {
            staff: {
                id: staff.id,
                name: staff.name,
                role: staff.role as StaffRole,
            },
        },
    };
}

/**
 * 2. Logout Staff
 */
export async function logoutStaff(slug: string): Promise<ActionResult> {
    const cookieStore = await cookies();
    cookieStore.delete(`dineos_staff_${slug}`);
    revalidatePath(`/staff/${slug}/floor`);
    revalidatePath(`/staff/${slug}/kds`);
    return { success: true };
}

/**
 * Helper to verify staff session from cookies
 */
export async function getStaffSession(slug: string): Promise<StaffSessionData | null> {
    const cookieStore = await cookies();
    const raw = cookieStore.get(`dineos_staff_${slug}`)?.value;
    if (!raw) return null;
    try {
        return JSON.parse(raw) as StaffSessionData;
    } catch {
        return null;
    }
}

/**
 * Strict Server Action Authorization Guard:
 * Checks for a verified staff session matching restaurantId and optional role requirements.
 */
export async function requireStaffAuth(
    restaurantId: string,
    slug?: string,
    allowedRoles?: StaffRole[]
): Promise<ActionResult<StaffSessionData>> {
    const cookieStore = await cookies();
    let session: StaffSessionData | null = null;

    if (slug) {
        const raw = cookieStore.get(`dineos_staff_${slug}`)?.value;
        if (raw) {
            try {
                session = JSON.parse(raw) as StaffSessionData;
            } catch {
                session = null;
            }
        }
    } else {
        // Fallback: search cookies for matching tenant restaurantId
        const allCookies = cookieStore.getAll();
        for (const c of allCookies) {
            if (c.name.startsWith('dineos_staff_')) {
                try {
                    const parsed = JSON.parse(c.value) as StaffSessionData;
                    if (parsed && parsed.restaurantId === restaurantId) {
                        session = parsed;
                        break;
                    }
                } catch {
                    // ignore invalid JSON
                }
            }
        }
    }

    if (!session) {
        return { success: false, error: 'Unauthorized: Staff session expired or not authenticated.' };
    }

    if (session.restaurantId !== restaurantId) {
        return { success: false, error: 'Unauthorized: Cross-tenant session mismatch.' };
    }

    if (allowedRoles && allowedRoles.length > 0) {
        // OWNER role can perform any staff action
        if (session.role !== 'OWNER' && !allowedRoles.includes(session.role)) {
            return { success: false, error: 'Access denied: Insufficient role permissions.' };
        }
    }

    return { success: true, data: session };
}

/**
 * 3. Approve Incoming Guest Order -> Move to IN_KITCHEN & update Table to EATING
 */
export async function approveOrder(
    restaurantId: string,
    orderId: string,
    slug?: string
): Promise<ActionResult> {
    const auth = await requireStaffAuth(restaurantId, slug, ['WAITER', 'KITCHEN']);
    if (!auth.success) return { success: false, error: auth.error };

    // 1. Fetch order to get table_id
    const { data: order, error: orderFetchErr } = await supabaseAdmin
        .from('orders')
        .select('id, table_id, status')
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId)
        .single();

    if (orderFetchErr || !order) {
        return { success: false, error: 'Order not found.' };
    }

    // 2. Update order status to IN_KITCHEN
    const { error: orderUpdateErr } = await supabaseAdmin
        .from('orders')
        .update({
            status: 'IN_KITCHEN',
            approved_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId);

    if (orderUpdateErr) {
        return { success: false, error: orderUpdateErr.message };
    }

    // 3. Update table status to EATING
    await supabaseAdmin
        .from('tables')
        .update({ status: 'EATING' })
        .eq('id', order.table_id)
        .eq('restaurant_id', restaurantId);

    return { success: true };
}

/**
 * 4. Reject Guest Order -> Move to CANCELLED
 */
export async function rejectOrder(
    restaurantId: string,
    orderId: string,
    slug?: string
): Promise<ActionResult> {
    const auth = await requireStaffAuth(restaurantId, slug, ['WAITER', 'KITCHEN']);
    if (!auth.success) return { success: false, error: auth.error };

    const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, table_id')
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId)
        .single();

    if (!order) {
        return { success: false, error: 'Order not found.' };
    }

    const { error } = await supabaseAdmin
        .from('orders')
        .update({ status: 'CANCELLED' })
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId);

    if (error) {
        return { success: false, error: error.message };
    }

    // Check if table has other unserved orders
    const { data: activeOrders } = await supabaseAdmin
        .from('orders')
        .select('id, status')
        .eq('table_id', order.table_id)
        .eq('restaurant_id', restaurantId)
        .in('status', ['PENDING_APPROVAL', 'IN_KITCHEN', 'READY']);

    if (!activeOrders || activeOrders.length === 0) {
        await supabaseAdmin
            .from('tables')
            .update({ status: 'ORDERING' })
            .eq('id', order.table_id)
            .eq('restaurant_id', restaurantId);
    }

    return { success: true };
}

/**
 * 5. Update Order Item Prep Status (QUEUED -> PREPARING -> READY -> SERVED)
 * Automatically marks order as READY if all items reach READY.
 */
export async function updateOrderItemPrepStatus(
    restaurantId: string,
    itemId: string,
    prepStatus: ItemPrepStatus,
    slug?: string
): Promise<ActionResult> {
    const auth = await requireStaffAuth(restaurantId, slug, ['WAITER', 'KITCHEN']);
    if (!auth.success) return { success: false, error: auth.error };

    const { data: updatedItem, error: itemErr } = await supabaseAdmin
        .from('order_items')
        .update({ prep_status: prepStatus })
        .eq('id', itemId)
        .eq('restaurant_id', restaurantId)
        .select('order_id')
        .single();

    if (itemErr || !updatedItem) {
        return { success: false, error: itemErr?.message || 'Item not found.' };
    }

    // Check all sibling items in this order
    const { data: allItems } = await supabaseAdmin
        .from('order_items')
        .select('prep_status')
        .eq('order_id', updatedItem.order_id)
        .eq('restaurant_id', restaurantId);

    if (allItems && allItems.length > 0) {
        const allReadyOrServed = allItems.every(
            (i) => i.prep_status === 'READY' || i.prep_status === 'SERVED'
        );

        if (allReadyOrServed) {
            await supabaseAdmin
                .from('orders')
                .update({
                    status: 'READY',
                    ready_at: new Date().toISOString(),
                })
                .eq('id', updatedItem.order_id)
                .eq('restaurant_id', restaurantId);
        }
    }

    return { success: true };
}

/**
 * 6. Bump Entire Order Ready (Kitchen Chef Action)
 */
export async function bumpOrderReady(
    restaurantId: string,
    orderId: string,
    slug?: string
): Promise<ActionResult> {
    const auth = await requireStaffAuth(restaurantId, slug, ['WAITER', 'KITCHEN']);
    if (!auth.success) return { success: false, error: auth.error };

    // 1. Mark all items as READY
    await supabaseAdmin
        .from('order_items')
        .update({ prep_status: 'READY' })
        .eq('order_id', orderId)
        .eq('restaurant_id', restaurantId);

    // 2. Mark order as READY
    const { error } = await supabaseAdmin
        .from('orders')
        .update({
            status: 'READY',
            ready_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * 7. Mark Order Served (Waiter Floor Action)
 */
export async function markOrderServed(
    restaurantId: string,
    orderId: string,
    slug?: string
): Promise<ActionResult> {
    const auth = await requireStaffAuth(restaurantId, slug, ['WAITER']);
    if (!auth.success) return { success: false, error: auth.error };

    await supabaseAdmin
        .from('order_items')
        .update({ prep_status: 'SERVED' })
        .eq('order_id', orderId)
        .eq('restaurant_id', restaurantId);

    const { error } = await supabaseAdmin
        .from('orders')
        .update({ status: 'SERVED' })
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * 8. Resolve Service Request (Water, Napkins, Waiter, Bill)
 */
export async function resolveServiceRequest(
    restaurantId: string,
    requestId: string,
    slug?: string
): Promise<ActionResult> {
    const auth = await requireStaffAuth(restaurantId, slug, ['WAITER']);
    if (!auth.success) return { success: false, error: auth.error };

    const { data: req, error } = await supabaseAdmin
        .from('service_requests')
        .update({
            status: 'RESOLVED',
            resolved_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('restaurant_id', restaurantId)
        .select('table_id')
        .single();

    if (error || !req) {
        return { success: false, error: error?.message || 'Request not found.' };
    }

    // Check if other open requests remain for this table
    const { data: openReqs } = await supabaseAdmin
        .from('service_requests')
        .select('id')
        .eq('table_id', req.table_id)
        .eq('restaurant_id', restaurantId)
        .eq('status', 'OPEN');

    if (!openReqs || openReqs.length === 0) {
        // Check active orders for this table
        const { data: activeOrders } = await supabaseAdmin
            .from('orders')
            .select('status')
            .eq('table_id', req.table_id)
            .eq('restaurant_id', restaurantId)
            .in('status', ['IN_KITCHEN', 'READY', 'SERVED']);

        const newStatus: TableStatus = (activeOrders && activeOrders.length > 0) ? 'EATING' : 'ORDERING';

        await supabaseAdmin
            .from('tables')
            .update({ status: newStatus })
            .eq('id', req.table_id)
            .eq('restaurant_id', restaurantId);
    }

    return { success: true };
}

/**
 * 9. Reset / Free Table Session
 * Closes table session, deletes cart items, and sets tables.status to FREE.
 */
export async function resetTableSession(
    restaurantId: string,
    tableId: string,
    sessionId?: string | null,
    slug?: string
): Promise<ActionResult> {
    const auth = await requireStaffAuth(restaurantId, slug, ['WAITER']);
    if (!auth.success) return { success: false, error: auth.error };

    if (sessionId) {
        await supabaseAdmin
            .from('table_sessions')
            .update({
                is_active: false,
                closed_at: new Date().toISOString(),
            })
            .eq('id', sessionId)
            .eq('restaurant_id', restaurantId);

        await supabaseAdmin
            .from('cart_items')
            .delete()
            .eq('session_id', sessionId)
            .eq('restaurant_id', restaurantId);
    }

    const { error } = await supabaseAdmin
        .from('tables')
        .update({
            status: 'FREE',
            active_session_id: null,
        })
        .eq('id', tableId)
        .eq('restaurant_id', restaurantId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}
