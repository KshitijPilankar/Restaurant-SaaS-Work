import React from 'react';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
    Restaurant,
    KitchenStation,
    Order,
    OrderItem,
    RestaurantTable,
} from '@/types/database';
import { getStaffSession } from '@/app/staff/[slug]/actions';
import { StaffPinGate } from '@/components/staff/StaffPinGate';
import { KdsBoard } from '@/components/staff/KdsBoard';

interface KdsPageProps {
    params: Promise<{ slug: string }>;
}

interface OrderWithItems extends Order {
    order_items?: OrderItem[];
}

export default async function KdsPage({ params }: KdsPageProps) {
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

    // 2. Check Staff Session Cookie
    const staffSession = await getStaffSession(slug);
    if (!staffSession || staffSession.restaurantId !== rest.id) {
        return (
            <StaffPinGate
                slug={slug}
                restaurantName={rest.name}
                targetRole="KITCHEN"
                surfaceTitle="Kitchen Display System (KDS)"
            />
        );
    }

    // 3. Fetch Stations, Tables & Active Kitchen Orders
    const [stationsRes, tablesRes, ordersRes] = await Promise.all([
        supabaseAdmin
            .from('kitchen_stations')
            .select('*')
            .eq('restaurant_id', rest.id)
            .order('sort_order', { ascending: true }),
        supabaseAdmin
            .from('tables')
            .select('*')
            .eq('restaurant_id', rest.id),
        supabaseAdmin
            .from('orders')
            .select('*, order_items(*)')
            .eq('restaurant_id', rest.id)
            .in('status', ['IN_KITCHEN', 'READY'])
            .order('created_at', { ascending: true }),
    ]);

    const stations = (stationsRes.data as KitchenStation[]) || [];
    const tables = (tablesRes.data as RestaurantTable[]) || [];
    const initialOrders = (ordersRes.data as OrderWithItems[]) || [];

    return (
        <KdsBoard
            restaurant={rest}
            stations={stations}
            initialOrders={initialOrders}
            tables={tables}
            staffName={staffSession.name}
        />
    );
}
