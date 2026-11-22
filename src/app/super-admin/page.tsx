import { supabaseAdmin } from '@/lib/supabase/server';
import { isSuperAdminAuthenticated } from '@/app/super-admin/actions';
import { SuperAdminLogin } from '@/components/super-admin/SuperAdminLogin';
import { SuperAdminDashboard } from '@/components/super-admin/SuperAdminDashboard';
import { Restaurant } from '@/types/database';

export default async function SuperAdminPage() {
    const isAuthed = await isSuperAdminAuthenticated();

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
