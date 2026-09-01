import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Akun lama (sebelum fitur role staff ada) tidak punya baris di
  // staff_profiles — diperlakukan sebagai admin (backward compatible).
  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle();
  const role = profile?.role || 'admin';

  return (
    <DashboardShell user={user} role={role} fullName={profile?.full_name}>
      {children}
    </DashboardShell>
  );
}
