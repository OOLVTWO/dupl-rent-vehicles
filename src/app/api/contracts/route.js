import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAuth, getUserRole, missingFields } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// GET /api/contracts — admin lihat semua kontrak; driver hanya lihat
// kontrak yang dia buat sendiri (di-scope di server) — sebelumnya endpoint
// ini mengembalikan semua kontrak (termasuk data pribadi customer: nama,
// No. KTP, telepon, foto, tanda tangan) ke siapa pun yang login.
export async function GET(request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const supabase = await createAdminClient();
  let query = supabase
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false });

  const role = await getUserRole(request);
  if (role === 'driver') {
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    query = query.eq('created_by', user.id);
  }

  const { data, error } = await query;
  if (error) {
    console.error('GET /api/contracts error:', error.message);
    return NextResponse.json({ error: 'Gagal mengambil data kontrak.' }, { status: 500 });
  }
  return NextResponse.json(Array.isArray(data) ? data : []);
}

// POST /api/contracts — buat kontrak baru (admin & driver boleh, termasuk tanda tangan + foto)
export async function POST(request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body request bukan JSON valid.' }, { status: 400 });

  const missing = missingFields(body, ['customer_name', 'start_date', 'end_date']);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Field wajib belum diisi: ${missing.join(', ')}` }, { status: 400 });
  }
  if (!body.signature_url) {
    return NextResponse.json({ error: 'Tanda tangan customer wajib diisi.' }, { status: 400 });
  }

  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();

  let createdByName = user?.email || 'Staff';
  try {
    const { data: profile } = await sessionClient.from('staff_profiles').select('full_name').eq('id', user.id).maybeSingle();
    if (profile?.full_name) createdByName = profile.full_name;
  } catch { /* fall back to email */ }

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('contracts')
    .insert([{
      transaction_id: body.transaction_id || null,
      booking_id: body.booking_id || null,
      vehicle_id: body.vehicle_id || null,
      vehicle_name: body.vehicle_name || null,
      customer_name: String(body.customer_name).trim(),
      customer_id_number: body.customer_id_number || null,
      customer_phone: body.customer_phone || null,
      customer_address: body.customer_address || null,
      start_date: body.start_date,
      end_date: body.end_date,
      passport_photo_url: body.passport_photo_url || null,
      customer_vehicle_photo_url: body.customer_vehicle_photo_url || null,
      signature_url: body.signature_url,
      notes: body.notes || null,
      created_by: user?.id || null,
      created_by_name: createdByName,
    }])
    .select()
    .single();

  if (error) {
    console.error('POST /api/contracts error:', error.message);
    return NextResponse.json({ error: 'Gagal menyimpan kontrak.' }, { status: 500 });
  }
  return NextResponse.json(data);
}
