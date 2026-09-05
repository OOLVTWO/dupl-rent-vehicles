import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth, getUserRole } from '@/lib/apiAuth';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/bookings — admin lihat semua booking; driver HANYA boleh lihat
// booking yang ditugaskan ke dirinya sendiri (di-scope di server, bukan
// cuma disaring di client — sebelumnya endpoint ini mengembalikan semua
// booking ke siapa pun yang login, termasuk data pribadi customer di
// booking milik driver lain).
export async function GET(request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const supabase = await createAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabase.from('bookings').select('*').order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);

  const role = await getUserRole(request);
  if (role === 'driver') {
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    query = query.eq('assigned_driver_id', user.id);
  }

  const { data, error } = await query;
  if (error) {
    console.error('GET /api/bookings error:', error.message);
    return NextResponse.json(
      { error: 'Gagal mengambil data booking.', detail: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json(Array.isArray(data) ? data : []);
}
