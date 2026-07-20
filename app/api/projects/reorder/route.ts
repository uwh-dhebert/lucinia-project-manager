import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sortProjectsForPriorities, type PriorityZone } from '@/lib/project-priorities';
import { canAccessProject, getAccessibleProjects } from '@/lib/project-access';

const VALID_ZONES: PriorityZone[] = ['in_design', 'prioritized', 'active', 'qa', 'completed'];

interface ReorderItem {
  id: string;
  zone: PriorityZone;
  sortOrder: number;
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const items: ReorderItem[] = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
    }

    for (const item of items) {
      if (!item.id || !VALID_ZONES.includes(item.zone) || typeof item.sortOrder !== 'number') {
        return NextResponse.json({ error: 'Invalid item in reorder payload' }, { status: 400 });
      }
    }

    for (const item of items) {
      const allowed = await canAccessProject(supabase, user.id, item.id);
      if (!allowed) {
        return NextResponse.json({ error: 'Unauthorized to update one or more projects' }, { status: 403 });
      }
    }

    const now = new Date().toISOString();

    const results = await Promise.all(
      items.map((item) =>
        supabase
          .from('projects')
          .update({
            priorityZone: item.zone,
            priorityOrder: item.sortOrder,
            updatedAt: now,
          })
          .eq('id', item.id)
      )
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) {
      return NextResponse.json({ error: failed.error.message }, { status: 500 });
    }

    const projects = await getAccessibleProjects(supabase, user.id);
    return NextResponse.json(sortProjectsForPriorities(projects));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}