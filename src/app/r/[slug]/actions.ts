'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { TableGuest, CartItem, Order, OrderItem, RequestType } from '@/types/database';

export interface ActionResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface JoinSessionResult {
    sessionId: string;
    guestId: string;
    guestName: string;
    guests: TableGuest[];
}

/**
 * 1. Join or Create a Table Session:
 * If table already has an active session, appends the guest.
 * If not, creates a new table_sessions row and updates table.status to 'ORDERING'.
 */
export async function joinOrCreateTableSession(
    restaurantId: string,
    tableId: string,
    guestName: string
): Promise<ActionResult<JoinSessionResult>> {
    const trimmedName = guestName?.trim();
    if (!trimmedName) {
        return { success: false, error: 'Please enter your name.' };
    }

    // 1. Fetch current table to verify existence and check active_session_id
    const { data: table, error: tableErr } = await supabaseAdmin
        .from('tables')
        .select('id, active_session_id, status')
        .eq('id', tableId)
        .eq('restaurant_id', restaurantId)
        .single();

    if (tableErr || !table) {
        return { success: false, error: 'Table not found.' };
    }

    const newGuestId = crypto.randomUUID();

    // 2. Check if active session already exists on this table
    if (table.active_session_id) {
        const { data: existingSession } = await supabaseAdmin
            .from('table_sessions')
            .select('*')
            .eq('id', table.active_session_id)
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .maybeSingle();

        if (existingSession) {
            const currentGuests: TableGuest[] = Array.isArray(existingSession.guests)
                ? (existingSession.guests as TableGuest[])
                : [];

            // Check if guest with same name already exists in this session
            const existingGuest = currentGuests.find(
                (g) => g.name.toLowerCase() === trimmedName.toLowerCase()
            );

            if (existingGuest) {
                // Reconnect existing guest identity
                return {
                    success: true,
                    data: {
                        sessionId: existingSession.id,
                        guestId: existingGuest.guest_id,
                        guestName: existingGuest.name,
                        guests: currentGuests,
                    },
                };
            }

            const updatedGuests: TableGuest[] = [
                ...currentGuests,
                { guest_id: newGuestId, name: trimmedName },
            ];

            const { error: updateErr } = await supabaseAdmin
                .from('table_sessions')
                .update({ guests: updatedGuests })
                .eq('id', existingSession.id)
                .eq('restaurant_id', restaurantId);

            if (updateErr) {
                return { success: false, error: 'Failed to join table session.' };
            }

            return {
                success: true,
                data: {
                    sessionId: existingSession.id,
                    guestId: newGuestId,
                    guestName: trimmedName,
                    guests: updatedGuests,
                },
            };
        }
    }

    // 3. No active session -> Create new table_session
    const newSessionId = crypto.randomUUID();
    const initialGuests: TableGuest[] = [{ guest_id: newGuestId, name: trimmedName }];

    const { error: sessionInsertErr } = await supabaseAdmin
        .from('table_sessions')
        .insert({
            id: newSessionId,
            restaurant_id: restaurantId,
            table_id: tableId,
            guests: initialGuests,
            is_active: true,
        });

    if (sessionInsertErr) {
        return { success: false, error: `Failed to create table session: ${sessionInsertErr.message}` };
    }

    // 4. Link session to table and set status to ORDERING
    const { error: tableUpdateErr } = await supabaseAdmin
        .from('tables')
        .update({
            active_session_id: newSessionId,
            status: 'ORDERING',
        })
        .eq('id', tableId)
        .eq('restaurant_id', restaurantId);

    if (tableUpdateErr) {
        return { success: false, error: 'Failed to update table status.' };
    }

    return {
        success: true,
        data: {
            sessionId: newSessionId,
            guestId: newGuestId,
            guestName: trimmedName,
            guests: initialGuests,
        },
    };
}

/**
 * 2. Add Item to Shared Table Cart:
 * Scoped to restaurant_id and session_id.
 * If the exact same item, variant, and guest already exists, increments quantity.
 */
export async function addToSharedCart(input: {
    restaurantId: string;
    sessionId: string;
    menuItemId: string;
    addedByGuestId: string;
    addedByName: string;
    variantName?: string | null;
    unitPrice?: number;
    quantity: number;
    notes?: string | null;
}): Promise<ActionResult<{ cartItem: CartItem }>> {
    const qty = Math.max(1, Number(input.quantity) || 1);
    const variantName = input.variantName?.trim() || null;
    const notes = input.notes?.trim() || null;

    // 1. Validate active table session
    const { data: session, error: sessErr } = await supabaseAdmin
        .from('table_sessions')
        .select('id, is_active')
        .eq('id', input.sessionId)
        .eq('restaurant_id', input.restaurantId)
        .eq('is_active', true)
        .maybeSingle();

    if (sessErr || !session) {
        return { success: false, error: 'Table session is closed or invalid.' };
    }

    // 2. Authoritative Server-side Price Resolution (prevent client price tampering)
    const { data: menuItem, error: menuErr } = await supabaseAdmin
        .from('menu_items')
        .select('id, base_price, variants, is_available')
        .eq('id', input.menuItemId)
        .eq('restaurant_id', input.restaurantId)
        .maybeSingle();

    if (menuErr || !menuItem) {
        return { success: false, error: 'Menu item not found.' };
    }

    if (menuItem.is_available === false) {
        return { success: false, error: 'This item is currently sold out.' };
    }

    let authoritativeUnitPrice = Number(menuItem.base_price);
    if (variantName && Array.isArray(menuItem.variants)) {
        interface MenuItemVariant {
            name: string;
            price_delta?: number;
        }
        const variant = (menuItem.variants as MenuItemVariant[]).find((v) => v.name === variantName);
        if (variant && typeof variant.price_delta === 'number') {
            authoritativeUnitPrice += variant.price_delta;
        }
    }

    if (isNaN(authoritativeUnitPrice) || authoritativeUnitPrice < 0) {
        return { success: false, error: 'Invalid dish pricing.' };
    }

    // Check for existing cart item by same guest with same variant
    let query = supabaseAdmin
        .from('cart_items')
        .select('*')
        .eq('restaurant_id', input.restaurantId)
        .eq('session_id', input.sessionId)
        .eq('menu_item_id', input.menuItemId)
        .eq('added_by_guest_id', input.addedByGuestId);

    if (variantName) {
        query = query.eq('variant_name', variantName);
    } else {
        query = query.is('variant_name', null);
    }

    const { data: existingItem } = await query.maybeSingle();

    if (existingItem) {
        const newQty = existingItem.quantity + qty;
        const { data: updatedItem, error } = await supabaseAdmin
            .from('cart_items')
            .update({
                quantity: newQty,
                unit_price: authoritativeUnitPrice,
                notes: notes || existingItem.notes,
            })
            .eq('id', existingItem.id)
            .eq('restaurant_id', input.restaurantId)
            .select()
            .single();

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true, data: { cartItem: updatedItem as CartItem } };
    }

    // Insert new cart item with verified authoritative price
    const { data: newItem, error } = await supabaseAdmin
        .from('cart_items')
        .insert({
            restaurant_id: input.restaurantId,
            session_id: input.sessionId,
            menu_item_id: input.menuItemId,
            added_by_guest_id: input.addedByGuestId,
            added_by_name: input.addedByName,
            variant_name: variantName,
            unit_price: authoritativeUnitPrice,
            quantity: qty,
            notes,
        })
        .select()
        .single();

    if (error || !newItem) {
        return { success: false, error: error?.message || 'Failed to add item to cart.' };
    }

    return { success: true, data: { cartItem: newItem as CartItem } };
}

/**
 * 3. Update Cart Item Quantity or Remove:
 * If newQuantity <= 0, deletes the row.
 */
export async function updateCartItemQuantity(
    restaurantId: string,
    sessionId: string,
    cartItemId: string,
    newQuantity: number
): Promise<ActionResult> {
    if (newQuantity <= 0) {
        const { error } = await supabaseAdmin
            .from('cart_items')
            .delete()
            .eq('id', cartItemId)
            .eq('restaurant_id', restaurantId)
            .eq('session_id', sessionId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    }

    const { error } = await supabaseAdmin
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', cartItemId)
        .eq('restaurant_id', restaurantId)
        .eq('session_id', sessionId);

    if (error) {
        return { success: false, error: error.message };
    }
    return { success: true };
}

/**
 * 4. Place Shared Order:
 * Atomically reads cart_items, creates an orders row with status 'PENDING_APPROVAL',
 * inserts order_items (mapping station_id from menu_items for KDS split),
 * empties cart_items, and updates tables.status to 'PENDING_APPROVAL'.
 */
export async function placeSharedOrder(
    restaurantId: string,
    tableId: string,
    sessionId: string,
    placedByName: string
): Promise<ActionResult<{ orderId: string }>> {
    // 1. Fetch current cart items
    const { data: cartItems, error: cartErr } = await supabaseAdmin
        .from('cart_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('session_id', sessionId);

    if (cartErr || !cartItems || cartItems.length === 0) {
        return { success: false, error: 'Your table cart is empty.' };
    }

    // 2. Fetch menu items to map station_id and dish names
    const menuItemIds = Array.from(new Set(cartItems.map((ci) => ci.menu_item_id)));
    const { data: menuItems } = await supabaseAdmin
        .from('menu_items')
        .select('id, name, station_id')
        .eq('restaurant_id', restaurantId)
        .in('id', menuItemIds);

    const itemMap = new Map((menuItems || []).map((m) => [m.id, m]));

    // 3. Compute Subtotal
    const subtotal = cartItems.reduce(
        (sum, item) => sum + Number(item.unit_price) * item.quantity,
        0
    );

    // 4. Insert Order
    const { data: order, error: orderErr } = await supabaseAdmin
        .from('orders')
        .insert({
            restaurant_id: restaurantId,
            table_id: tableId,
            session_id: sessionId,
            placed_by_name: placedByName || 'Table Guest',
            status: 'PENDING_APPROVAL',
            subtotal,
        })
        .select()
        .single();

    if (orderErr || !order) {
        return { success: false, error: `Failed to create order: ${orderErr?.message}` };
    }

    // 5. Insert Order Items
    const orderItemsToInsert = cartItems.map((ci) => {
        const mi = itemMap.get(ci.menu_item_id);
        return {
            restaurant_id: restaurantId,
            order_id: order.id,
            menu_item_id: ci.menu_item_id,
            station_id: mi?.station_id || null,
            item_name: mi?.name || 'Dish',
            variant_name: ci.variant_name,
            quantity: ci.quantity,
            unit_price: ci.unit_price,
            ordered_by_name: ci.added_by_name,
            notes: ci.notes,
            prep_status: 'QUEUED' as const,
        };
    });

    const { error: itemsErr } = await supabaseAdmin
        .from('order_items')
        .insert(orderItemsToInsert);

    if (itemsErr) {
        return { success: false, error: `Failed to create order items: ${itemsErr.message}` };
    }

    // 6. Clear table cart
    await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('restaurant_id', restaurantId)
        .eq('session_id', sessionId);

    // 7. Update table status to PENDING_APPROVAL
    await supabaseAdmin
        .from('tables')
        .update({ status: 'PENDING_APPROVAL' })
        .eq('id', tableId)
        .eq('restaurant_id', restaurantId);

    return { success: true, data: { orderId: order.id } };
}

/**
 * 5. Create Service Request (Call Waiter / Water / Napkins / Bill):
 * Scoped to restaurant_id and table_id.
 */
export async function createServiceRequest(
    restaurantId: string,
    tableId: string,
    sessionId: string | null,
    type: RequestType
): Promise<ActionResult> {
    const { error } = await supabaseAdmin
        .from('service_requests')
        .insert({
            restaurant_id: restaurantId,
            table_id: tableId,
            session_id: sessionId || null,
            type,
            status: 'OPEN',
        });

    if (error) {
        return { success: false, error: error.message };
    }

    // Update table status to reflect service request
    const targetStatus = type === 'BILL' ? 'BILL' : 'HELP';
    await supabaseAdmin
        .from('tables')
        .update({ status: targetStatus })
        .eq('id', tableId)
        .eq('restaurant_id', restaurantId);

    return { success: true };
}
