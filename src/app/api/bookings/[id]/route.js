import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAuth, requireAdmin } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

const VALID_STATUS = ['pending', 'confirmed', 'cancelled', 'completed'];
const VALID_FULFILLMENT = ['pickup', 'delivery'];
const VALID_PAYMENT = ['card', 'transfer', 'cash', 'qris'];

// PATCH /api/bookings/[id] — ubah status dan/atau detail booking (admin only;
// staff/driver hanya boleh MELIHAT booking, tidak boleh mengedit) — KECUALI
// aksi khusus "confirm_delivery" di bawah, yang boleh dipakai driver yang
// ditugaskan untuk booking itu sendiri (konfirmasi motor sudah diantar).
export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body request bukan JSON valid.' }, { status: 400 });

  if (body.action === 'confirm_delivery') {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    const admin = await createAdminClient();

    const { data: existing } = await admin
      .from('bookings')
      .select('assigned_driver_id, fulfillment_method, delivered_at')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: 'Booking tidak ditemukan.' }, { status: 404 });
    if (existing.fulfillment_method !== 'delivery') {
      return NextResponse.json({ error: 'Booking ini bukan delivery.' }, { status: 400 });
    }

    const { data: profile } = await sessionClient
      .from('staff_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const role = profile?.role || 'admin';

    if (role !== 'admin' && existing.assigned_driver_id !== user.id) {
      return NextResponse.json({ error: 'Kamu bukan driver yang ditugaskan untuk booking ini.' }, { status: 403 });
    }

    // Wajib sudah ada Kontrak (data diri + foto + tanda tangan customer) untuk
    // booking ini sebelum delivery boleh dikonfirmasi — memastikan bukti
    // serah terima selalu ada sebelum status "Delivered".
    const { count: contractCount } = await admin
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('booking_id', id);
    if (!contractCount || contractCount === 0) {
      return NextResponse.json(
        { error: 'Buat Kontrak (data diri, foto, tanda tangan customer) dulu sebelum konfirmasi delivery.' },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from('bookings')
      .update({ delivered_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Motor resmi lagi disewa customer sekarang — update status di /fleet.
    if (data.vehicle_id) {
      await admin.from('vehicles').update({ status: 'rented' }).eq('id', data.vehicle_id);
    }

    // Ongkos delivery otomatis kecatat sebagai pendapatan driver yang
    // ditugaskan — muncul di History Pendapatan dia, status "unpaid"
    // sampai admin tandai lunas.
    if (data.assigned_driver_id && Number(data.delivery_fee) > 0) {
      await admin.from('expenses').insert([{
        type: 'income',
        title: `Delivery Fee — ${data.delivery_zone_name || data.customer_name}`,
        category: 'delivery_fee',
        amount: Number(data.delivery_fee),
        expense_date: new Date().toISOString().split('T')[0],
        staff_id: data.assigned_driver_id,
        booking_id: data.id,
        payment_status: 'unpaid',
        notes: `Otomatis dari delivery booking ${data.customer_name}`,
      }]);
    }

    return NextResponse.json(data);
  }

  const authError = await requireAdmin(request);
  if (authError) return authError;

  const supabase = await createAdminClient();

  const updateData = {};

  if ('status' in body) {
    if (!VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ error: `Status tidak valid: ${body.status}` }, { status: 400 });
    }
    updateData.status = body.status;
  }
  if ('fulfillment_method' in body) {
    if (!VALID_FULFILLMENT.includes(body.fulfillment_method)) {
      return NextResponse.json({ error: `Metode tidak valid: ${body.fulfillment_method}` }, { status: 400 });
    }
    updateData.fulfillment_method = body.fulfillment_method;
  }
  if ('payment_method' in body) {
    if (!VALID_PAYMENT.includes(body.payment_method)) {
      return NextResponse.json({ error: `Metode pembayaran tidak valid: ${body.payment_method}` }, { status: 400 });
    }
    updateData.payment_method = body.payment_method;
  }
  if ('customer_name' in body) {
    const name = String(body.customer_name || '').trim();
    if (!name) return NextResponse.json({ error: 'Nama customer wajib diisi.' }, { status: 400 });
    updateData.customer_name = name;
  }
  if ('customer_phone' in body) {
    const phone = String(body.customer_phone || '').trim();
    if (!phone) return NextResponse.json({ error: 'Nomor telepon wajib diisi.' }, { status: 400 });
    updateData.customer_phone = phone;
  }
  if ('customer_address' in body) updateData.customer_address = body.customer_address || null;
  if ('customer_id_number' in body) updateData.customer_id_number = body.customer_id_number || null;
  if ('vehicle_id' in body) updateData.vehicle_id = body.vehicle_id || null;
  if ('vehicle_name' in body) updateData.vehicle_name = body.vehicle_name || null;
  if ('vehicle_category' in body) updateData.vehicle_category = body.vehicle_category || null;
  if ('payment_status' in body) updateData.payment_status = body.payment_status || 'unpaid';
  if ('dp_amount' in body) {
    const dp = Number(body.dp_amount);
    updateData.dp_amount = Number.isFinite(dp) && dp >= 0 ? dp : 0;
  }
  if ('delivery_zone_id' in body) updateData.delivery_zone_id = body.delivery_zone_id || null;
  if ('delivery_zone_name' in body) updateData.delivery_zone_name = body.delivery_zone_name || null;
  if ('delivery_fee' in body) {
    const fee = Number(body.delivery_fee);
    updateData.delivery_fee = Number.isFinite(fee) && fee >= 0 ? fee : 0;
  }
  if ('notes' in body) updateData.notes = body.notes;
  if ('wa_notified_at' in body) updateData.wa_notified_at = body.wa_notified_at;
  if ('estimated_price' in body) {
    const price = Number(body.estimated_price);
    updateData.estimated_price = Number.isFinite(price) && price >= 0 ? price : 0;
  }
  // Penugasan driver untuk booking delivery — biaya delivery dibagi full ke driver ini.
  if ('assigned_driver_id' in body) {
    updateData.assigned_driver_id = body.assigned_driver_id || null;
    updateData.assigned_driver_name = body.assigned_driver_name || null;
  }

  // Tanggal — kalau salah satu diubah, hitung ulang duration_days otomatis.
  if ('start_date' in body || 'end_date' in body) {
    const startDate = body.start_date;
    const endDate = body.end_date;
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Tanggal mulai dan selesai wajib diisi.' }, { status: 400 });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return NextResponse.json({ error: 'Rentang tanggal tidak valid.' }, { status: 400 });
    }
    updateData.start_date = startDate;
    updateData.end_date = endDate;
    updateData.duration_days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  }

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('PATCH /api/bookings/[id] error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sinkronkan status motor di halaman /fleet mengikuti tahap booking:
  // dikonfirmasi admin -> "booked" (bukan available lagi tapi belum di
  // tangan customer), dibatalkan/selesai -> balik "available". Status
  // "rented" sendiri baru di-set saat driver konfirmasi delivery (di atas)
  // — untuk booking pickup, motor tetap "booked" sampai admin menandai
  // selesai, karena belum ada langkah "konfirmasi ambil di toko" terpisah.
  if (data.vehicle_id && 'status' in body) {
    if (body.status === 'confirmed') {
      await supabase.from('vehicles').update({ status: 'booked' }).eq('id', data.vehicle_id).eq('status', 'available');
    } else if (body.status === 'cancelled') {
      await supabase.from('vehicles').update({ status: 'available' }).eq('id', data.vehicle_id).in('status', ['booked', 'rented']);
    } else if (body.status === 'completed' && !body.skip_vehicle_sync) {
      // skip_vehicle_sync: dipakai saat booking auto-"completed" karena baru
      // saja dikonversi jadi Transaksi — motor sudah benar berstatus
      // "rented" lewat endpoint transaksi, jangan ditimpa balik "available".
      await supabase.from('vehicles').update({ status: 'available' }).eq('id', data.vehicle_id).in('status', ['booked', 'rented']);
    }
  }

  // Kalau booking ini sudah punya Transaksi dan/atau Kontrak terkait,
  // sinkronkan perubahan info customer ke keduanya supaya datanya nggak
  // beda sendiri antara Booking Confirmation, Transaksi, dan Laporan
  // Kontrak (mis. nomor HP beda di 3 tempat karena masing-masing nyimpen
  // salinan sendiri-sendiri).
  const contactFields = ['customer_name', 'customer_phone', 'customer_address'];
  if (contactFields.some(f => f in body)) {
    const txUpdate = {};
    if ('customer_name' in body) txUpdate.renter_name = updateData.customer_name;
    if ('customer_phone' in body) txUpdate.renter_phone = updateData.customer_phone;
    if ('customer_address' in body) txUpdate.renter_address = updateData.customer_address;
    await supabase.from('transactions').update(txUpdate).eq('booking_id', id);

    const contractUpdate = {};
    if ('customer_name' in body) contractUpdate.customer_name = updateData.customer_name;
    if ('customer_phone' in body) contractUpdate.customer_phone = updateData.customer_phone;
    if ('customer_address' in body) contractUpdate.customer_address = updateData.customer_address;
    await supabase.from('contracts').update(contractUpdate).eq('booking_id', id);
  }

  return NextResponse.json(data);
}

// DELETE /api/bookings/[id] — admin only
export async function DELETE(request, { params }) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = await createAdminClient();

  const { data: booking } = await supabase
    .from('bookings')
    .select('vehicle_id, status')
    .eq('id', id)
    .single();

  // Cek dulu transaksi yang bakal dihapus di bawah — kalau statusnya
  // 'active', motornya perlu dibalikin ke available juga. Ini raw delete
  // (bukan lewat route DELETE transaksi), jadi reset status motor yang ada
  // di route itu TIDAK otomatis kepanggil — makanya dicek manual di sini.
  const { data: linkedTx } = await supabase
    .from('transactions')
    .select('status, vehicle_id')
    .eq('booking_id', id)
    .maybeSingle();

  // Transaksi & booking yang sama itu 1 kesatuan — hapus salah satu, hapus
  // juga yang lain. Transaksinya harus dihapus DULU (foreign key
  // transactions.booking_id nolak hapus booking selama masih ada transaksi
  // yang nunjuk ke situ). Kontrak (dokumen legal bertanda tangan) TETAP
  // disimpan, cuma di-lepas (booking_id di-null-kan). Tapi catatan
  // pendapatan driver yang otomatis dari booking ini (ongkos delivery) ikut
  // DIHAPUS — kalau sumbernya (booking/transaksinya) udah nggak ada, nggak
  // masuk akal riwayat pendapatannya masih nyantol di History Pendapatan.
  await supabase.from('transactions').delete().eq('booking_id', id);
  await supabase.from('contracts').update({ booking_id: null }).eq('booking_id', id);
  await supabase.from('expenses').delete().eq('booking_id', id);

  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Kalau booking yang dihapus masih dalam status aktif (motornya lagi
  // ke-tandain booked/rented), balikin motornya jadi available lagi —
  // sebelumnya ini nggak ada, jadi motor bisa "nyangkut" statusnya kalau
  // booking-nya dihapus langsung tanpa dibatalkan/diselesaikan dulu.
  // Dicek dari 2 sisi: status booking-nya sendiri, ATAU transaksi yang
  // barusan ikut dihapus di atas kalau itu masih 'active'.
  const shouldReset =
    (booking && booking.vehicle_id && ['pending', 'confirmed'].includes(booking.status)) ||
    (linkedTx && linkedTx.status === 'active');
  if (shouldReset) {
    const vId = booking?.vehicle_id || linkedTx?.vehicle_id;
    if (vId) await supabase.from('vehicles').update({ status: 'available' }).eq('id', vId);
  }

  return NextResponse.json({ success: true });
}
