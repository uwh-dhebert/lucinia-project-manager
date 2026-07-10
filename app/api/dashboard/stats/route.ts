import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { getAccessibleProjects } from '@/lib/project-access';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await getAccessibleProjects(supabase, user.id);

    const [docsRes, groupsRes] = await Promise.all([
      supabase.from('topics').select('id', { count: 'exact', head: true }),
      supabase.from('link_groups').select('id').eq('userId', user.id),
    ]);

    let linkCount = 0;
    const groupIds = (groupsRes.data ?? []).map((g) => g.id);
    if (groupIds.length > 0) {
      const { count } = await supabase
        .from('links')
        .select('id', { count: 'exact', head: true })
        .in('groupId', groupIds);
      linkCount = count ?? 0;
    }

    return NextResponse.json({
      projects: projects.length,
      documents: docsRes.count ?? 0,
      links: linkCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}