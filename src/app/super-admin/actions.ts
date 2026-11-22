'use server';

import crypto from 'crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/server';
import { CUISINE_PRESETS, CuisinePreset } from '@/lib/presets/cuisines';
import { TenantStatus, Restaurant } from '@/types/database';

const SUPER_ADMIN_COOKIE = 'dineos_super_admin';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export interface CloneRestaurantInput {
    name: string;
    slug: string;
    primaryColor?: string;
    logoUrl?: string;
    tableCount?: number;
    cuisinePreset: 'north-indian' | 'cafe-bakery' | 'fast-food-qsr';
    wifiSsid?: string;
    wifiPassword?: string;
    upiId?: string;
    googleReviewUrl?: string;
}

export interface ActionResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Returns the configured master secret. Fails closed if missing or < 16 chars.
 */
function getSuperAdminSecret(): string {
    const secret = process.env.SUPER_ADMIN_PASSKEY?.trim();
    if (!secret || secret.length < 16) {
        throw new Error(
            'Security Error: SUPER_ADMIN_PASSKEY must be defined in environment variables with at least 16 characters.'
        );
    }
    return secret;
}

/**
 * Generates an HMAC-signed session token for the Super Admin.
 */
function computeSuperAdminToken(secret: string): string {
    const timestamp = Date.now().toString();
    const payload = `super-admin-session:${timestamp}`;
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return `auth:${timestamp}:${signature}`;
}

/**
 * Verifies the HMAC-signed Super Admin session token.
 */
function verifySuperAdminToken(token: string, secret: string): boolean {
    if (!token || !token.startsWith('auth:')) return false;
    const parts = token.split(':');
    if (parts.length !== 3) return false;

    const [, timestamp, signature] = parts;
    const time = parseInt(timestamp, 10);
    if (isNaN(time) || Date.now() - time > COOKIE_MAX_AGE * 1000 || time > Date.now() + 60000) {
        return false;
    }

    const payload = `super-admin-session:${timestamp}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expBuf.length) return false;

    return crypto.timingSafeEqual(sigBuf, expBuf);
}

/**
 * Checks if the request has a valid HMAC-signed super admin session cookie.
 */
export async function isSuperAdminAuthenticated(): Promise<boolean> {
    try {
        const secret = getSuperAdminSecret();
        const cookieStore = await cookies();
        const cookie = cookieStore.get(SUPER_ADMIN_COOKIE);
        if (!cookie?.value) return false;
        return verifySuperAdminToken(cookie.value, secret);
    } catch {
        return false;
    }
}

/**
 * Verifies the master passkey against process.env.SUPER_ADMIN_PASSKEY using constant-time comparison.
 * Sets an HTTP-only 7-day HMAC-signed session cookie on success.
 */
export async function verifySuperAdminPasskey(passkey: string): Promise<ActionResult> {
    let secret: string;
    try {
        secret = getSuperAdminSecret();
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Server authentication misconfiguration';
        return { success: false, error: msg };
    }

    if (!passkey || typeof passkey !== 'string') {
        return { success: false, error: 'Master passkey is required.' };
    }

    const passBuf = Buffer.from(passkey.trim());
    const secBuf = Buffer.from(secret);

    // Constant-time check to prevent timing analysis attacks
    if (passBuf.length !== secBuf.length || !crypto.timingSafeEqual(passBuf, secBuf)) {
        return { success: false, error: 'Invalid master passkey. Access denied.' };
    }

    const token = computeSuperAdminToken(secret);
    const cookieStore = await cookies();
    cookieStore.set(SUPER_ADMIN_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
    });

    return { success: true };
}

/**
 * Logs out the super admin by removing the session cookie.
 */
export async function logoutSuperAdmin(): Promise<ActionResult> {
    const cookieStore = await cookies();
    cookieStore.delete(SUPER_ADMIN_COOKIE);
    revalidatePath('/super-admin');
    return { success: true };
}

/**
 * 2-Minute Pitch Cloner:
 * Atomically provisions a complete tenant with kitchen stations,
 * categories, menu items, tables, and staff PINs based on a selected cuisine preset.
 */
export async function cloneRestaurantDemo(
    input: CloneRestaurantInput
): Promise<ActionResult<{ restaurant: Restaurant }>> {
    if (!(await isSuperAdminAuthenticated())) {
        return { success: false, error: 'Unauthorized: Master passkey authentication required.' };
    }

    const trimmedName = input.name?.trim();
    if (!trimmedName) {
        return { success: false, error: 'Restaurant name is required.' };
    }

    // Sanitize slug: lowercase, letters/digits/hyphens only
    const sanitizedSlug = (input.slug || trimmedName)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    if (!sanitizedSlug) {
        return { success: false, error: 'A valid alphanumeric slug is required.' };
    }

    // Check if slug is already taken
    const { data: existingTenant } = await supabaseAdmin
        .from('restaurants')
        .select('id')
        .eq('slug', sanitizedSlug)
        .maybeSingle();

    if (existingTenant) {
        return { success: false, error: `Restaurant slug "${sanitizedSlug}" is already in use. Choose another slug.` };
    }

    const preset: CuisinePreset = CUISINE_PRESETS[input.cuisinePreset];
    if (!preset) {
        return { success: false, error: `Invalid cuisine preset "${input.cuisinePreset}".` };
    }

    const primaryColor = input.primaryColor?.trim() || '#EA580C';
    const demoExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Insert Restaurant Tenant
    const { data: restaurant, error: restError } = await supabaseAdmin
        .from('restaurants')
        .insert({
            name: trimmedName,
            slug: sanitizedSlug,
            logo_url: input.logoUrl?.trim() || null,
            cover_image_url: null,
            primary_color: primaryColor,
            cuisine_preset: preset.id,
            tax_percentage: 5.0,
            wifi_ssid: input.wifiSsid?.trim() || null,
            wifi_password: input.wifiPassword?.trim() || null,
            upi_id: input.upiId?.trim() || null,
            google_review_url: input.googleReviewUrl?.trim() || null,
            status: 'DEMO',
            demo_expires_at: demoExpiresAt,
        })
        .select()
        .single();

    if (restError || !restaurant) {
        return { success: false, error: `Failed to create restaurant: ${restError?.message || 'Unknown error'}` };
    }

    const restaurantId = restaurant.id;

    try {
        // 2. Insert Kitchen Stations from Preset
        const stationsToInsert = preset.stations.map((stationName, idx) => ({
            restaurant_id: restaurantId,
            name: stationName,
            sort_order: idx,
        }));

        const { data: insertedStations, error: stationsError } = await supabaseAdmin
            .from('kitchen_stations')
            .insert(stationsToInsert)
            .select();

        if (stationsError || !insertedStations) {
            throw new Error(`Failed to create kitchen stations: ${stationsError?.message}`);
        }

        const stationMap = new Map<string, string>();
        for (const st of insertedStations) {
            stationMap.set(st.name, st.id);
        }

        // 3. Insert Menu Categories from Preset
        const categoriesToInsert = preset.categories.map((categoryName, idx) => ({
            restaurant_id: restaurantId,
            name: categoryName,
            sort_order: idx,
            is_active: true,
        }));

        const { data: insertedCategories, error: categoriesError } = await supabaseAdmin
            .from('menu_categories')
            .insert(categoriesToInsert)
            .select();

        if (categoriesError || !insertedCategories) {
            throw new Error(`Failed to create menu categories: ${categoriesError?.message}`);
        }

        const categoryMap = new Map<string, string>();
        for (const cat of insertedCategories) {
            categoryMap.set(cat.name, cat.id);
        }

        // 4. Insert Menu Items with Mapped Category & Station IDs
        const itemsToInsert = preset.items.map((item) => {
            const categoryId = categoryMap.get(item.category);
            if (!categoryId) {
                throw new Error(`Category "${item.category}" not found in mapped categories.`);
            }
            const stationId = stationMap.get(item.station) || null;

            return {
                restaurant_id: restaurantId,
                category_id: categoryId,
                station_id: stationId,
                name: item.name,
                description: item.description,
                base_price: item.base_price,
                image_url: item.image_url,
                is_veg: item.is_veg,
                spice: item.spice,
                allergens: item.allergens,
                variants: item.variants,
                prep_time_mins: item.prep_time_mins,
                is_available: true,
                is_bestseller: item.is_bestseller,
            };
        });

        const { error: itemsError } = await supabaseAdmin
            .from('menu_items')
            .insert(itemsToInsert);

        if (itemsError) {
            throw new Error(`Failed to create menu items: ${itemsError.message}`);
        }

        // 5. Insert Tables (T1 .. Tn)
        const count = Math.min(Math.max(Number(input.tableCount) || 8, 1), 50);
        const tablesToInsert = Array.from({ length: count }, (_, i) => ({
            restaurant_id: restaurantId,
            table_code: `T${i + 1}`,
            display_name: `Table ${i + 1}`,
            capacity: 4,
            status: 'FREE' as const,
        }));

        const { error: tablesError } = await supabaseAdmin
            .from('tables')
            .insert(tablesToInsert);

        if (tablesError) {
            throw new Error(`Failed to create tables: ${tablesError.message}`);
        }

        // 6. Insert 3 Default Staff Users with Quick PINs (1111 OWNER, 2222 WAITER, 3333 KITCHEN)
        const staffToInsert = [
            {
                restaurant_id: restaurantId,
                name: 'Store Manager',
                role: 'OWNER' as const,
                pin_code: '1111',
                is_active: true,
            },
            {
                restaurant_id: restaurantId,
                name: 'Floor Captain',
                role: 'WAITER' as const,
                pin_code: '2222',
                is_active: true,
            },
            {
                restaurant_id: restaurantId,
                name: 'Head Chef',
                role: 'KITCHEN' as const,
                pin_code: '3333',
                is_active: true,
            },
        ];

        const { error: staffError } = await supabaseAdmin
            .from('staff_users')
            .insert(staffToInsert);

        if (staffError) {
            throw new Error(`Failed to create default staff users: ${staffError.message}`);
        }

        revalidatePath('/super-admin');
        return { success: true, data: { restaurant } };
    } catch (err) {
        // Rollback restaurant on creation failure
        await supabaseAdmin.from('restaurants').delete().eq('id', restaurantId);
        const message = err instanceof Error ? err.message : 'Unknown error during demo provisioning.';
        return { success: false, error: message };
    }
}

/**
 * Updates the lifecycle status of a tenant (DEMO, TRIAL, ACTIVE, PAUSED).
 */
export async function updateTenantStatus(
    restaurantId: string,
    status: TenantStatus
): Promise<ActionResult> {
    if (!(await isSuperAdminAuthenticated())) {
        return { success: false, error: 'Unauthorized: Master passkey authentication required.' };
    }

    const { error } = await supabaseAdmin
        .from('restaurants')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', restaurantId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/super-admin');
    return { success: true };
}

/**
 * Permanently deletes a restaurant tenant and cascades to all child data.
 */
export async function deleteTenant(restaurantId: string): Promise<ActionResult> {
    if (!(await isSuperAdminAuthenticated())) {
        return { success: false, error: 'Unauthorized: Master passkey authentication required.' };
    }

    const { error } = await supabaseAdmin
        .from('restaurants')
        .delete()
        .eq('id', restaurantId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/super-admin');
    return { success: true };
}
