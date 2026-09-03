import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin, readJsonBody, missingFields, toNonNegativeNumber } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

const VALID_STATUS = ['active', 'completed', 'cancelled'];
const VALID_PAYMENT = ['paid', 'unpaid'];

// GET /api/transactions
export async function GET(request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const supabase = await createAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  let query = supabase
    .from('transactions')
    .select(`*, vehicles(id, name, plate_number, rate_per_day)`)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') query = query.eq('status', status);
  if (startDate) query = query.gte('created_at', startDate.includes('T') ? startDate : `${startDate}T00:00:00Z`);
  if (endDate) query = query.lte('created_at', endDate.includes('T') ? endDate : `${endDate}T23:59:59Z`);

  const { data, error } = await query;
  if (error) {
    console.error('GET /api/transactions error:', error.message);
    return NextResponse.json(
      { error: 'Gagal mengambil data transaksi.', detail: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json(Array.isArray(data) ? data : []);
}

// POST /api/transactions — admin only. Driver sudah tidak lagi mengelola
// transaksi sama sekali — fokus driver adalah Kontrak & Booking Confirmation.
export async function POST(request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const supabase = await createAdminClient();
  const body = await readJsonBody(request);
  if (!body) return NextResponse.json({ error: 'Body request bukan JSON valid.' }, { status: 400 });

  // FIX #1: Validasi vehicle_id SEBELUM destructuring — pastikan tidak hilang
  // Trim dulu untuk antisipasi whitespace tersembunyi dari UI
  const rawVehicleId = typeof body.vehicle_id === 'string' ? body.vehicle_id.trim() : body.vehicle_id;
  if (!rawVehicleId) {
    return NextResponse.json({ error: 'Unit motor wajib dipilih!' }, { status: 400 });
  }

  const missing = missingFields(body, ['renter_name', 'start_date', 'end_date']);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Field wajib kosong: ${missing.join(', ')}` }, { status: 400 });
  }

  if (isNaN(Date.parse(body.start_date)) || isNaN(Date.parse(body.end_date))) {
    return NextResponse.json({ error: 'Tanggal sewa tidak valid.' }, { status: 400 });
  }
  if (new Date(body.end_date) < new Date(body.start_date)) {
    return NextResponse.json({ error: 'Tanggal selesai sebelum tanggal mulai.' }, { status: 400 });
  }

  const status = body.status || 'active';
  if (!VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: `Status tidak valid: ${status}` }, { status: 400 });
  }

  // Transaksi = sewa yang BENERAN terjadi sekarang (motor langsung
  // kesetel "Disewa"). Kalau tanggal mulainya masih di masa depan, ini
  // seharusnya jadi Booking (Pending) dulu, bukan Transaksi aktif —
  // supaya motornya nggak salah kesetel "disewa" padahal belum diambil.
  const todayStr = new Date().toISOString().split('T')[0];
  if (status === 'active' && body.start_date > todayStr) {
    return NextResponse.json({
      error: 'Tanggal mulai masih di masa depan — ini seharusnya dicatat sebagai Booking (Pending), bukan Transaksi aktif. Transaksi langsung menandai motor "Disewa" mulai sekarang.',
    }, { status: 400 });
  }

  const paymentStatus = body.payment_status || 'paid';
  if (!VALID_PAYMENT.includes(paymentStatus)) {
    return NextResponse.json({ error: `payment_status tidak valid: ${paymentStatus}` }, { status: 400 });
  }

  const { duration_days, deposit, total_price, damage_fee, discount, km_start, km_end, vehicles, payment_status, ...insertData } = body;

  // FIX #2: Cleanup hanya field _id yang BENAR-BENAR kosong, tapi JANGAN hapus vehicle_id
  // karena sudah divalidasi di atas. Gunakan rawVehicleId yang sudah di-trim.
  Object.keys(insertData).forEach(key => {
    if (key === 'vehicle_id') return; // skip — sudah divalidasi, jangan hapus
    if ((key === 'id' || key.endsWith('_id')) && typeof insertData[key] === 'string' && !insertData[key].trim()) {
      delete insertData[key];
    }
  });

  // Pastikan vehicle_id menggunakan nilai yang sudah di-trim
  insertData.vehicle_id = rawVehicleId;

  // Validasi motor benar-benar ada di database (cegah transaksi ke motor fiktif)
  const { data: veh, error: vehError } = await supabase
    .from('vehicles')
    .select('id, status')
    .eq('id', insertData.vehicle_id)
    .maybeSingle();

  if (vehError) {
    console.error('Vehicle lookup error:', vehError.message);
    return NextResponse.json({ error: 'Gagal memverifikasi unit motor. Coba lagi.' }, { status: 500 });
  }
  if (!veh) {
    return NextResponse.json({
      error: `Motor tidak ditemukan di database (ID: ${insertData.vehicle_id}). Silakan refresh halaman dan pilih ulang.`
    }, { status: 400 });
  }

  // FIX: duration_days adalah GENERATED column di database (otomatis dihitung dari
  // start_date & end_date) — jangan dikirim ke insert, database yang isi sendiri.
  const payload = {
    ...insertData,
    deposit: toNonNegativeNumber(deposit, 0),
    total_price: toNonNegativeNumber(total_price, 0),
    damage_fee: toNonNegativeNumber(damage_fee, 0),
    discount: toNonNegativeNumber(discount, 0),
    km_start: toNonNegativeNumber(km_start, 0),
    km_end: toNonNegativeNumber(km_end, 0),
    payment_status: paymentStatus,
  };

  if (!payload.id) delete payload.id;

  let { data: tx, error } = await supabase
    .from('transactions')
    .insert([payload])
    .select(`*, vehicles(id, name, plate_number, rate_per_day)`)
    .single();

  // FIX #3: Smart Fallback jika kolom baru belum di-migrate di database Supabase
  // handover_image_url TIDAK dibuang dari fallback — disertakan agar tetap tersimpan.
  // Hanya kolom yang benar-benar baru (renter_address, discount, dll.) yang di-skip.
  if (error && (error.message.includes('Could not find the') || error.message.includes('schema cache'))) {
    console.warn('Fallback insertion without unmigrated columns:', error.message);

    // Identifikasi kolom mana yang menyebabkan error dari pesan error Supabase
    const missingCol = error.message.match(/'([^']+)'/)?.[1] || '';
    console.warn('Kolom bermasalah:', missingCol);

    // Buang hanya kolom yang diketahui belum ada di schema lama
    const {
      renter_address: _ra,
      discount: _d,
      damage_fee: _df,
      km_start: _ks,
      km_end: _ke,
      issues_reported: _ir,
      handover_image_url: _hou, // tetap buang jika schema lama tidak ada kolom ini
      ...fallbackPayload
    } = payload;

    const retry = await supabase
      .from('transactions')
      .insert([fallbackPayload])
      .select(`*, vehicles(id, name, plate_number, rate_per_day)`)
      .single();

    if (retry.error) {
      // Fallback paling minimal: hanya kolom inti
      console.warn('Fallback minimal insertion:', retry.error.message);
      const {
        customer_image_url: _ci,
        ...minimalPayload
      } = fallbackPayload;

      const retry2 = await supabase
        .from('transactions')
        .insert([minimalPayload])
        .select(`*, vehicles(id, name, plate_number, rate_per_day)`)
        .single();

      tx = retry2.data;
      error = retry2.error;
    } else {
      tx = retry.data;
      error = retry.error;
    }
  }

  if (error) {
    console.error('Transaction insert error:', error.message);
    return NextResponse.json({
      error: `Gagal menyimpan transaksi: ${error.message}`,
      hint: 'Pastikan schema database sudah diperbarui dengan menjalankan migration terbaru.'
    }, { status: 500 });
  }

  // Update status motor menjadi 'rented'
  await supabase
    .from('vehicles')
    .update({ status: 'rented' })
    .eq('id', insertData.vehicle_id);

  // Kalau transaksi ini dibuat dari sebuah booking (lihat tombol "Buat
  // Transaksi" di Booking Confirmation), tandai booking itu selesai supaya
  // tidak dibuatkan transaksi dobel. Vehicle sudah benar "rented" di atas,
  // jadi skip_vehicle_sync biar tidak ditimpa balik "available".
  if (insertData.booking_id) {
    await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', insertData.booking_id);
  }

  return NextResponse.json(tx, { status: 201 });
}
