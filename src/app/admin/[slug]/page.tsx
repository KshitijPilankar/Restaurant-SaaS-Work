import React from 'react';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
    Restaurant,
    RestaurantTable,
    MenuCategory,
    MenuItem,
    KitchenStation,
    Payment,
    Order,
    Review,
} from '@/types/database';
import { getStaffSession } from '@/app/staff/[slug]/actions';
import { StaffPinGate } from '@/components/staff/StaffPinGate';
import { OwnerAdminDashboard } from '@/components/admin/OwnerAdminDashboard';

interface AdminPageProps {
    params: Promise<{ slug: string }>;
}

export default async function RestaurantAdminPage({ params }: AdminPageProps) {
    const { slug } = await params;

    // 1. Fetch Restaurant
    const { data: restaurant, error: restErr } = await supabaseAdmin
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

    if (restErr || !restaurant) {
        notFound();
    }

    const rest = restaurant as Restaurant;

    // 2. Verify Owner Staff Session
    const staffSession = await getStaffSession(slug);
    if (
        !staffSession ||
        staffSession.restaurantId !== rest.id ||
        staffSession.role !== 'OWNER'
    ) {
        return (
            <StaffPinGate
                slug={slug}
                restaurantName={rest.name}
                targetRole="OWNER"
                surfaceTitle="Owner Admin Portal"
                theme="light"
            />
        );
    }

    // 3. Fetch Restaurant Admin Data in Parallel
    const [
        tablesRes,
        categoriesRes,
        stationsRes,
        menuItemsRes,
        paymentsRes,
        ordersRes,
        reviewsRes,
    ] = await Promise.all([
        supabaseAdmin
            .from('tables')
            .select('*')
            .eq('restaurant_id', rest.id)
            .order('table_code', { ascending: true }),
        supabaseAdmin
            .from('menu_categories')
            .select('*')
            .eq('restaurant_id', rest.id)
            .order('sort_order', { ascending: true }),
        supabaseAdmin
            .from('kitchen_stations')
            .select('*')
            .eq('restaurant_id', rest.id)
            .order('sort_order', { ascending: true }),
        supabaseAdmin
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', rest.id)
            .order('name', { ascending: true }),
        supabaseAdmin
            .from('payments')
            .select('*')
            .eq('restaurant_id', rest.id)
            .order('created_at', { ascending: false })
            .limit(100),
        supabaseAdmin
            .from('orders')
            .select('*')
            .eq('restaurant_id', rest.id)
            .order('created_at', { ascending: false })
            .limit(100),
        supabaseAdmin
            .from('reviews')
            .select('*')
            .eq('restaurant_id', rest.id)
            .order('created_at', { ascending: false })
            .limit(100),
    ]);

    return (
        <OwnerAdminDashboard
            restaurant={rest}
            tables={(tablesRes.data || []) as RestaurantTable[]}
            categories={(categoriesRes.data || []) as MenuCategory[]}
            stations={(stationsRes.data || []) as KitchenStation[]}
            menuItems={(menuItemsRes.data || []) as MenuItem[]}
            payments={(paymentsRes.data || []) as Payment[]}
            orders={(ordersRes.data || []) as Order[]}
            reviews={(reviewsRes.data || []) as Review[]}
            adminName={staffSession.name}
        />
    );
}
