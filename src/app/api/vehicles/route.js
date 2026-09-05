import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth, requireAdmin, getUserRole, redactVehicleFields, readJsonBody, missingFields, toNonNegativeNumber } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

const VALID_STATUS = ['available', 'rented', 'maintenance'];
const VALID_CATEGORIES = ['honda', 'yamaha', 'suzuki', 'kawasaki', 'vespa', 'other'];

// GET /api/vehicles — admin & driver boleh akses (driver butuh ini untuk
// lihat plat motor di Booking), TAPI field rahasia investor/harga beli
// disaring dulu untuk role driver sebelum dikirim.
export async function GET(request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const supabase = await createAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabase.from('vehicles').select('*').order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    // PERUBAHAN: jangan sembunyikan error sebagai [] — laporkan agar tidak
    // tampil sebagai "tidak ada data".
    console.error('GET /api/vehicles error:', error.message);
    return NextResponse.json(
      { error: 'Gagal mengambil data motor.', detail: error.message },
      { status: 500 }
    );
  }
  const role = await getUserRole(request);
  const safeData = role === 'driver' ? redactVehicleFields(data) : data;
  return NextResponse.json(Array.isArray(safeData) ? safeData : []);
}

// POST /api/vehicles — khusus admin, driver tidak boleh membuat data motor.
export async function POST(request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const supabase = await createAdminClient();
  const body = await readJsonBody(request);
  if (!body) return NextResponse.json({ error: 'Body request bukan JSON valid.' }, { status: 400 });

  const missing = missingFields(body, ['name']);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Field wajib kosong: ${missing.join(', ')}` }, { status: 400 });
  }

  const year = parseInt(body.year) || new Date().getFullYear();
  if (year < 1990 || year > new Date().getFullYear() + 1) {
    return NextResponse.json({ error: `Tahun kendaraan tidak valid: ${year}` }, { status: 400 });
  }

  const status = body.status || 'available';
  if (!VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: `Status tidak valid: ${status}` }, { status: 400 });
  }
  const category = body.category || 'honda';
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: `Kategori tidak valid: ${category}` }, { status: 400 });
  }

  const sharePct = parseInt(body.revenue_share_percentage) || 70;
  if (sharePct < 0 || sharePct > 100) {
    return NextResponse.json({ error: 'Persentase bagi hasil harus 0–100.' }, { status: 400 });
  }

  const plate = String(body.plate_number || '').trim().toUpperCase();

  // Cegah plat nomor duplikat (kecuali saat mengedit motor yang sama)
  if (plate) {
    let dupQuery = supabase.from('vehicles').select('id').eq('plate_number', plate);
    if (body.id) dupQuery = dupQuery.neq('id', body.id);
    const { data: dup } = await dupQuery.maybeSingle();
    if (dup) {
      return NextResponse.json({ error: 'Plat nomor sudah terdaftar pada motor lain.' }, { status: 409 });
    }
  }

  const payload = {
    name: String(body.name).trim(),
    plate_number: plate || null,
    year,
    color: body.color || '',
    category,
    rate_per_day: toNonNegativeNumber(body.rate_per_day, 0),
    rate_per_week: toNonNegativeNumber(body.rate_per_week, 0),
    rate_per_month: toNonNegativeNumber(body.rate_per_month, 0),
    status,
    image_url: body.image_url || null,
    current_km: toNonNegativeNumber(body.current_km, 15000),
    notes: body.notes || '',
    owner_type: body.owner_type || 'internal',
    owner_name: body.owner_name || '',
    owner_contact: body.owner_contact || '',
    revenue_share_percentage: sharePct,
    purchase_date: (body.purchase_date && String(body.purchase_date).trim() !== '') ? body.purchase_date : null,
    purchase_price: toNonNegativeNumber(body.purchase_price, 0),
  };

  let { data, error } = await supabase.from('vehicles').insert([payload]).select().single();

  // Smart Fallback jika kolom baru belum di-migrate di database Supabase
  if (error && (error.message.includes('Could not find the') || error.message.includes('schema cache'))) {
    console.warn('Fallback insertion without unmigrated columns:', error.message);
    const { owner_type: _ot, owner_name: _on, owner_contact: _oc, revenue_share_percentage: _rsp, purchase_date: _pd, purchase_price: _pp, ...fallbackPayload } = payload;
    const retry = await supabase.from('vehicles').insert([fallbackPayload]).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('POST /api/vehicles error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
