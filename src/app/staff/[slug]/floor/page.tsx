import React from 'react';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
    Restaurant,
    RestaurantTable,
    Order,
    OrderItem,
    ServiceRequest,
    TableSession,
} from '@/types/database';
import { getStaffSession } from '@/app/staff/[slug]/actions';
import { StaffPinGate } from '@/components/staff/StaffPinGate';
import { FloorDashboard } from '@/components/staff/FloorDashboard';

interface FloorPageProps {
    params: Promise<{ slug: string }>;
}

interface OrderWithItems extends Order {
    order_items?: OrderItem[];
}

export default async function FloorPage({ params }: FloorPageProps) {
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
                targetRole="WAITER"
                surfaceTitle="Floor Waiter Map"
            />
        );
    }

    // 3. Fetch Operational Data in Parallel
    const [tablesRes, ordersRes, requestsRes, sessionsRes] = await Promise.all([
        supabaseAdmin
            .from('tables')
            .select('*')
            .eq('restaurant_id', rest.id)
            .order('table_code', { ascending: true }),
        supabaseAdmin
            .from('orders')
            .select('*, order_items(*)')
            .eq('restaurant_id', rest.id)
            .in('status', ['PENDING_APPROVAL', 'IN_KITCHEN', 'READY'])
            .order('created_at', { ascending: false }),
        supabaseAdmin
            .from('service_requests')
            .select('*')
            .eq('restaurant_id', rest.id)
            .eq('status', 'OPEN')
            .order('created_at', { ascending: false }),
        supabaseAdmin
            .from('table_sessions')
            .select('*')
            .eq('restaurant_id', rest.id)
            .eq('is_active', true),
    ]);

    const initialTables = (tablesRes.data as RestaurantTable[]) || [];
    const initialOrders = (ordersRes.data as OrderWithItems[]) || [];
    const initialRequests = (requestsRes.data as ServiceRequest[]) || [];
    const initialSessions = (sessionsRes.data as TableSession[]) || [];

    return (
        <FloorDashboard
            restaurant={rest}
            initialTables={initialTables}
            initialOrders={initialOrders}
            initialRequests={initialRequests}
            initialSessions={initialSessions}
            staffName={staffSession.name}
            staffRole={staffSession.role}
        />
    );
}
