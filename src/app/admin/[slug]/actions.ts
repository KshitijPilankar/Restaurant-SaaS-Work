'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/server';
import { SpiceLevel, MenuItem } from '@/types/database';
import { getStaffSession } from '@/app/staff/[slug]/actions';

export interface AdminActionResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Helper to ensure the active staff session is authenticated as OWNER for this tenant
 */
async function verifyOwnerSession(slug: string, restaurantId: string): Promise<boolean> {
    const session = await getStaffSession(slug);
    if (!session) return false;
    if (session.restaurantId !== restaurantId) return false;
    return session.role === 'OWNER';
}

/**
 * 1. Toggle Menu Item Availability (In Stock / Sold Out)
 */
export async function toggleMenuItemAvailability(
    slug: string,
    restaurantId: string,
    menuItemId: string,
    isAvailable: boolean
): Promise<AdminActionResult> {
    const isAuth = await verifyOwnerSession(slug, restaurantId);
    if (!isAuth) {
        return { success: false, error: 'Unauthorized: Owner access required.' };
    }

    const { error } = await supabaseAdmin
        .from('menu_items')
        .update({ is_available: isAvailable })
        .eq('id', menuItemId)
        .eq('restaurant_id', restaurantId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/admin/${slug}`);
    revalidatePath(`/r/${slug}`, 'layout');
    return { success: true };
}

/**
 * 2. Update Menu Item Base Price
 */
export async function updateMenuItemPrice(
    slug: string,
    restaurantId: string,
    menuItemId: string,
    newPrice: number
): Promise<AdminActionResult> {
    const isAuth = await verifyOwnerSession(slug, restaurantId);
    if (!isAuth) {
        return { success: false, error: 'Unauthorized: Owner access required.' };
    }

    if (isNaN(newPrice) || newPrice < 0) {
        return { success: false, error: 'Please enter a valid price.' };
    }

    const { error } = await supabaseAdmin
        .from('menu_items')
        .update({ base_price: newPrice })
        .eq('id', menuItemId)
        .eq('restaurant_id', restaurantId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/admin/${slug}`);
    revalidatePath(`/r/${slug}`, 'layout');
    return { success: true };
}

/**
 * 3. Create a New Menu Item
 */
export interface CreateMenuItemInput {
    name: string;
    description?: string;
    basePrice: number;
    categoryId: string;
    stationId?: string | null;
    isVeg: boolean;
    spice: SpiceLevel;
    allergens: string[];
    imageUrl?: string | null;
    isBestseller?: boolean;
    prepTimeMins?: number;
}

export async function createMenuItem(
    slug: string,
    restaurantId: string,
    input: CreateMenuItemInput
): Promise<AdminActionResult<{ item: MenuItem }>> {
    const isAuth = await verifyOwnerSession(slug, restaurantId);
    if (!isAuth) {
        return { success: false, error: 'Unauthorized: Owner access required.' };
    }

    if (!input.name || !input.name.trim()) {
        return { success: false, error: 'Dish name is required.' };
    }

    if (isNaN(input.basePrice) || input.basePrice < 0) {
        return { success: false, error: 'Valid base price is required.' };
    }

    if (!input.categoryId) {
        return { success: false, error: 'Menu category is required.' };
    }

    const { data, error } = await supabaseAdmin
        .from('menu_items')
        .insert({
            restaurant_id: restaurantId,
            category_id: input.categoryId,
            station_id: input.stationId || null,
            name: input.name.trim(),
            description: input.description?.trim() || null,
            base_price: input.basePrice,
            image_url: input.imageUrl?.trim() || null,
            is_veg: input.isVeg,
            spice: input.spice || 'NONE',
            allergens: input.allergens || [],
            variants: [],
            prep_time_mins: input.prepTimeMins || 15,
            is_available: true,
            is_bestseller: Boolean(input.isBestseller),
        })
        .select('*')
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/admin/${slug}`);
    revalidatePath(`/r/${slug}`, 'layout');
    return { success: true, data: { item: data as MenuItem } };
}

/**
 * 4. Delete Menu Item
 */
export async function deleteMenuItem(
    slug: string,
    restaurantId: string,
    menuItemId: string
): Promise<AdminActionResult> {
    const isAuth = await verifyOwnerSession(slug, restaurantId);
    if (!isAuth) {
        return { success: false, error: 'Unauthorized: Owner access required.' };
    }

    const { error } = await supabaseAdmin
        .from('menu_items')
        .delete()
        .eq('id', menuItemId)
        .eq('restaurant_id', restaurantId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/admin/${slug}`);
    revalidatePath(`/r/${slug}`, 'layout');
    return { success: true };
}

/**
 * 5. Update Restaurant Operational & Brand Settings
 */
export interface UpdateRestaurantSettingsInput {
    name: string;
    primaryColor: string;
    taxPercentage: number;
    wifiSsid?: string | null;
    wifiPassword?: string | null;
    upiId?: string | null;
    googleReviewUrl?: string | null;
    logoUrl?: string | null;
    coverImageUrl?: string | null;
}

export async function updateRestaurantSettings(
    slug: string,
    restaurantId: string,
    input: UpdateRestaurantSettingsInput
): Promise<AdminActionResult> {
    const isAuth = await verifyOwnerSession(slug, restaurantId);
    if (!isAuth) {
        return { success: false, error: 'Unauthorized: Owner access required.' };
    }

    if (!input.name || !input.name.trim()) {
        return { success: false, error: 'Restaurant name is required.' };
    }

    const hexColorRegex = /^#([0-9A-Fa-f]{3}){1,2}$/;
    if (!hexColorRegex.test(input.primaryColor)) {
        return { success: false, error: 'Primary color must be a valid hex code (e.g., #EA580C).' };
    }

    const tax = Number(input.taxPercentage);
    if (isNaN(tax) || tax < 0 || tax > 100) {
        return { success: false, error: 'Tax percentage must be between 0% and 100%.' };
    }

    if (input.googleReviewUrl && input.googleReviewUrl.trim()) {
        const trimmedReviewUrl = input.googleReviewUrl.trim();
        if (!trimmedReviewUrl.startsWith('https://')) {
            return { success: false, error: 'Google Review URL must begin with https://' };
        }
    }

    const { error } = await supabaseAdmin
        .from('restaurants')
        .update({
            name: input.name.trim(),
            primary_color: input.primaryColor.trim(),
            tax_percentage: tax,
            wifi_ssid: input.wifiSsid?.trim() || null,
            wifi_password: input.wifiPassword?.trim() || null,
            upi_id: input.upiId?.trim() || null,
            google_review_url: input.googleReviewUrl?.trim() || null,
            logo_url: input.logoUrl?.trim() || null,
            cover_image_url: input.coverImageUrl?.trim() || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', restaurantId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/admin/${slug}`);
    revalidatePath(`/r/${slug}`, 'layout');
    revalidatePath(`/staff/${slug}/floor`);
    revalidatePath(`/staff/${slug}/kds`);
    return { success: true };
}

/**
 * 6. Logout Owner
 */
export async function logoutOwner(slug: string): Promise<AdminActionResult> {
    const cookieStore = await cookies();
    cookieStore.delete(`dineos_staff_${slug}`);
    revalidatePath(`/admin/${slug}`);
    return { success: true };
}
