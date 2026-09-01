import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth, requireAdmin, readJsonBody, missingFields } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// GET /api/expenses
export async function GET(request) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const supabase = await createAdminClient();
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const typeFilter = searchParams.get('type');

  // First check if table exists
  const { error: checkError } = await supabase.from('expenses').select('id').limit(1);
  if (checkError && (checkError.message.includes('schema cache') || checkError.message.includes('does not exist') || checkError.message.includes('table') || checkError.code === '42P01' || checkError.code === 'PGRST204')) {
    console.warn('Expenses table missing. Run SQL migration first:', checkError.message);
    return NextResponse.json([], { status: 200 });
  }

  let query = supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false });

  if (startDate) query = query.gte('expense_date', startDate);
  if (endDate) query = query.lte('expense_date', endDate);
  if (typeFilter && typeFilter !== 'all') query = query.eq('type', typeFilter);

  const { data, error } = await query;
  if (error) {
    // PERUBAHAN: jangan sembunyikan error sebagai []
    console.error('Expenses query error:', error.message);
    return NextResponse.json(
      { error: 'Gagal mengambil data keuangan.', detail: error.message },
      { status: 500 }
    );
  }

  // Ensure type is properly normalized even if type column is missing in Supabase schema
  const normalizedData = (Array.isArray(data) ? data : []).map(item => {
    let type = item.type;
    if (!type) {
      if (typeof item.category === 'string' && (item.category.startsWith('income_') || item.category.includes('income'))) {
        type = 'income';
      } else {
        type = 'expense';
      }
    }
    return { ...item, type };
  });

  return NextResponse.json(normalizedData);
}

// POST /api/expenses
export async function POST(request) {
  const body = await readJsonBody(request);
  if (!body) return NextResponse.json({ error: 'Body request bukan JSON valid.' }, { status: 400 });

  // Staff/driver hanya boleh mencatat pengeluaran, bukan pemasukan.
  const authError = body.type === 'income' ? await requireAdmin(request) : await requireAuth(request);
  if (authError) return authError;

  const supabase = await createAdminClient();

  const missing = missingFields(body, ['title']);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Field wajib kosong: ${missing.join(', ')}` }, { status: 400 });
  }

  // Check if table exists first
  const { error: checkError } = await supabase.from('expenses').select('id').limit(1);
  if (checkError && (checkError.message.includes('schema cache') || checkError.message.includes('does not exist') || checkError.code === '42P01' || checkError.code === 'PGRST204')) {
    return NextResponse.json({
      error: 'Tabel expenses belum dibuat. Jalankan SQL migration di Supabase SQL Editor terlebih dahulu.',
      needsMigration: true
    }, { status: 503 });
  }

  // Validasi jumlah: harus angka positif (cegah nilai negatif / 0)
  const rawAmount = Number(String(body.amount || '0').replace(/[,.]/g, ''));
  const amount = Math.round(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Jumlah (amount) harus angka lebih dari 0.' }, { status: 400 });
  }

  const type = body.type === 'income' ? 'income' : 'expense';
  const payload = {
    type,
    title: String(body.title).trim(),
    category: body.category || (type === 'income' ? 'other_income' : 'service'),
    amount,
    expense_date: body.expense_date || new Date().toISOString().split('T')[0],
    notes: body.notes || ''
  };

  if (!payload.id) delete payload.id;

  let { data, error } = await supabase
    .from('expenses')
    .insert([payload])
    .select()
    .single();

  // Fallback if 'type' column does not exist in Supabase schema yet
  if (error && (error.message.includes('column "type"') || error.message.includes('type'))) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.type;
    const retry = await supabase
      .from('expenses')
      .insert([fallbackPayload])
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('POST /api/expenses error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
