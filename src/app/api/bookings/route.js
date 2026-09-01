import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// GET /api/bookings — daftar booking masuk dari website publik (admin only)
export async function GET(request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const supabase = await createAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabase.from('bookings').select('*').order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);

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
