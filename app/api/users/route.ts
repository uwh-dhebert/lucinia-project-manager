import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';

export interface AppUser {
  id: string;
  email: string;
  fullName: string | null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const users: AppUser[] = [];
    let page = 1;
    const perPage = 200;

    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      for (const authUser of data.users) {
        if (!authUser.email || authUser.id === user.id) continue;
        users.push({
          id: authUser.id,
          email: authUser.email,
          fullName:
            (authUser.user_metadata?.full_name as string | undefined) ??
            (authUser.user_metadata?.name as string | undefined) ??
            null,
        });
      }

      if (data.users.length < perPage) break;
      page += 1;
    }

    users.sort((a, b) => a.email.localeCompare(b.email));

    return NextResponse.json(users);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}