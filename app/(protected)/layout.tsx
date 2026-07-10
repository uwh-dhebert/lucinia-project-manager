import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { ProtectedShell } from '@/components/layout/ProtectedShell';
import { getAuthUserDisplayName } from '@/lib/users';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const userName = getAuthUserDisplayName(user.user_metadata, user.email);

  return (
    <ProtectedShell userName={userName}>
      {children}
    </ProtectedShell>
  );
}