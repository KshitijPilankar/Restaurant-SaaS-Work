import React from 'react';
import { UtensilsCrossed, AlertCircle } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
    Restaurant,
    RestaurantTable,
    MenuCategory,
    MenuItem,
    TableSession,
    CartItem,
    Order,
    OrderItem,
} from '@/types/database';
import { GuestAppShell } from '@/components/guest/GuestAppShell';

interface TablePageProps {
    params: Promise<{ slug: string; tableCode: string }>;
}

interface OrderWithItems extends Order {
    order_items?: OrderItem[];
}

export default async function GuestTablePage({ params }: TablePageProps) {
    const { slug, tableCode } = await params;
    const cleanTableCode = tableCode.trim();

    // 1. Fetch Restaurant Tenant
    const { data: restaurant, error: restErr } = await supabaseAdmin
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

    if (restErr || !restaurant) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-center">
                <div className="p-8 bg-white border border-zinc-200 rounded-3xl max-w-sm w-full space-y-3 shadow-xl">
                    <UtensilsCrossed className="w-10 h-10 text-zinc-400 mx-auto" />
                    <h1 className="text-lg font-bold text-zinc-900">Restaurant Not Found</h1>
                    <p className="text-xs text-zinc-500">This URL does not correspond to an active restaurant.</p>
                </div>
            </div>
        );
    }

    const rest = restaurant as Restaurant;

    // 2. Fetch Table for this Restaurant
    const { data: table, error: tableErr } = await supabaseAdmin
        .from('tables')
        .select('*')
        .eq('restaurant_id', rest.id)
        .ilike('table_code', cleanTableCode)
        .maybeSingle();

    if (tableErr || !table) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-center">
                <div className="p-8 bg-white border border-zinc-200 rounded-3xl max-w-sm w-full space-y-3 shadow-xl">
                    <AlertCircle className="w-10 h-10 text-orange-500 mx-auto" />
                    <h1 className="text-lg font-bold text-zinc-900">Table Not Found</h1>
                    <p className="text-xs text-zinc-500">
                        Table <strong className="font-mono text-zinc-800">{cleanTableCode}</strong> does not exist at {rest.name}.
                    </p>
                </div>
            </div>
        );
    }

    const restTable = table as RestaurantTable;

    // 3. Fetch Menu Categories & Items
    const [categoriesRes, itemsRes] = await Promise.all([
        supabaseAdmin
            .from('menu_categories')
            .select('*')
            .eq('restaurant_id', rest.id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
        supabaseAdmin
            .from('menu_items')
            .select('*')
            .eq('restaurant_id', rest.id)
            .eq('is_available', true)
            .order('name', { ascending: true }),
    ]);

    const categories = (categoriesRes.data as MenuCategory[]) || [];
    const menuItems = (itemsRes.data as MenuItem[]) || [];

    // 4. Fetch Active Session, Cart Items & Orders
    let initialSession: TableSession | null = null;
    let initialCart: CartItem[] = [];
    let initialOrders: OrderWithItems[] = [];

    if (restTable.active_session_id) {
        const { data: activeSess } = await supabaseAdmin
            .from('table_sessions')
            .select('*')
            .eq('id', restTable.active_session_id)
            .eq('restaurant_id', rest.id)
            .eq('is_active', true)
            .maybeSingle();

        if (activeSess) {
            initialSession = activeSess as TableSession;

            const [cartRes, ordersRes] = await Promise.all([
                supabaseAdmin
                    .from('cart_items')
                    .select('*')
                    .eq('restaurant_id', rest.id)
                    .eq('session_id', activeSess.id)
                    .order('created_at', { ascending: true }),
                supabaseAdmin
                    .from('orders')
                    .select('*, order_items(*)')
                    .eq('restaurant_id', rest.id)
                    .eq('session_id', activeSess.id)
                    .order('created_at', { ascending: false }),
            ]);

            initialCart = (cartRes.data as CartItem[]) || [];
            initialOrders = (ordersRes.data as OrderWithItems[]) || [];
        }
    }

    return (
        <GuestAppShell
            restaurant={rest}
            table={restTable}
            categories={categories}
            menuItems={menuItems}
            initialSession={initialSession}
            initialCart={initialCart}
            initialOrders={initialOrders}
        />
    );
}
