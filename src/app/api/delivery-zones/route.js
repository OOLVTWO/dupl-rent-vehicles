import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin, missingFields } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// GET /api/delivery-zones — daftar zona (admin only view via API; publik baca langsung lewat client + RLS)
export async function GET(request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const supabase = await createAdminClient();
  const { data, error } = await supabase.from('delivery_zones').select('*').order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST /api/delivery-zones — buat zona baru (admin only)
export async function POST(request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body request bukan JSON valid.' }, { status: 400 });

  const missing = missingFields(body, ['name', 'zone_label']);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Field wajib belum diisi: ${missing.join(', ')}` }, { status: 400 });
  }

  const fee = Number(body.fee);
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('delivery_zones')
    .insert([{
      name: String(body.name).trim(),
      zone_label: String(body.zone_label).trim(),
      color: body.color || '#3B82F6',
      fee: Number.isFinite(fee) && fee >= 0 ? fee : 0,
      sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
