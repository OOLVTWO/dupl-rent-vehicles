import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';
import DriverDashboard from './DriverDashboard';

// Ambil SEMUA baris dengan pagination (Supabase JS default limit = 1000 baris,
// jadi tanpa loop ini transaksi lama TIDAK PERNAH sampai ke dashboard —
// inilah salah satu penyebab data "hilang" dari statistik & laporan).
async function fetchAllRows(query, pageSize = 1000) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) {
      console.error('fetchAllRows error:', error.message);
      throw error;
    }
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

export default async function DashboardPage() {
  // Session user (bukan service role) — layout sudah proteksi auth + RLS
  // policy "authenticated = full access" (migration 001) menjamin data lengkap.
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle();
  const role = profile?.role || 'admin';

  // Driver dapat dashboard ringkas sendiri — bukan dashboard admin penuh
  // (yang isinya data investor & KPI sensitif lain).
  if (role === 'driver') {
    return <DriverDashboard fullName={profile?.full_name} />;
  }

  const [transactions, vehicles] = await Promise.all([
    fetchAllRows(
      supabase
        .from('transactions')
        .select(`*, vehicles(name, plate_number, rate_per_day)`)
        .order('created_at', { ascending: false })
    ),
    fetchAllRows(
      supabase.from('vehicles').select('*').order('created_at', { ascending: false })
    ),
  ]);

  return (
    <DashboardClient
      transactions={transactions || []}
      vehicles={vehicles || []}
    />
  );
}
