import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/server';
import { SuperAdminLogin } from '@/components/super-admin/SuperAdminLogin';
import { SuperAdminDashboard } from '@/components/super-admin/SuperAdminDashboard';
import { Restaurant } from '@/types/database';

export default async function SuperAdminPage() {
    const cookieStore = await cookies();
    const isAuthed = cookieStore.get('dineos_super_admin')?.value === 'authenticated';

    if (!isAuthed) {
        return <SuperAdminLogin />;
    }

    const { data: restaurants, error } = await supabaseAdmin
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching restaurants for super-admin:', error);
    }

    return <SuperAdminDashboard initialRestaurants={(restaurants as Restaurant[]) || []} />;
}
