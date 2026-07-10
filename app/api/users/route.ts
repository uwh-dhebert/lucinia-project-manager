import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { listAppUsers } from '@/lib/users';

export type { AppUser } from '@/lib/users';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const includeSelf = request.nextUrl.searchParams.get('includeSelf') === 'true';
    const users = await listAppUsers({
      excludeUserId: includeSelf ? undefined : user.id,
    });

    return NextResponse.json(users);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}