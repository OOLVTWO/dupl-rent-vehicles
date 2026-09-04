import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin, missingFields } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// GET /api/attributes — daftar atribut/aksesoris motor (admin only view via
// API; publik baca langsung lewat client + RLS di form booking)
export async function GET(request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const supabase = await createAdminClient();
  const { data, error } = await supabase.from('vehicle_attributes').select('*').order('is_auto_included', { ascending: false }).order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST /api/attributes — buat atribut baru (admin only)
export async function POST(request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body request bukan JSON valid.' }, { status: 400 });

  const missing = missingFields(body, ['name']);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Field wajib belum diisi: ${missing.join(', ')}` }, { status: 400 });
  }

  const price = Number(body.price);
  const quantity = Number(body.quantity);
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('vehicle_attributes')
    .insert([{
      name: String(body.name).trim(),
      quantity: Number.isFinite(quantity) && quantity >= 0 ? quantity : 0,
      price: Number.isFinite(price) && price >= 0 ? price : 0,
      is_auto_included: !!body.is_auto_included,
      icon: body.icon || 'fa-solid fa-plus',
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
