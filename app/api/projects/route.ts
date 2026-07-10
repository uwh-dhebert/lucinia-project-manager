import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAccessibleProjects } from '@/lib/project-access';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const projects = await getAccessibleProjects(supabase, user.id);
      return NextResponse.json(projects);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Could not find the table')) {
        return NextResponse.json(
          {
            error: 'Database not initialized',
            message: 'Please initialize your database first',
            redirect: '/setup',
          },
          { status: 503 }
        );
      }
      throw error;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    const projectId = randomUUID();
    const now = new Date().toISOString();

    const baseProject = {
      id: projectId,
      name,
      slug,
      description: description || '',
      ownerId: user.id,
      createdAt: now,
      updatedAt: now,
    };

    const { data: existingInDesign } = await supabase
      .from('projects')
      .select('priorityOrder')
      .eq('ownerId', user.id)
      .eq('priorityZone', 'in_design')
      .order('priorityOrder', { ascending: false })
      .limit(1);

    const nextOrder =
      existingInDesign?.[0]?.priorityOrder != null
        ? existingInDesign[0].priorityOrder + 1
        : 0;

    let { data: project, error } = await supabase
      .from('projects')
      .insert({
        ...baseProject,
        responsible: '',
        priorityZone: 'in_design',
        priorityOrder: nextOrder,
      })
      .select()
      .single();

    if (error?.message?.includes('priorityZone') || error?.message?.includes('priorityOrder')) {
      ({ data: project, error } = await supabase
        .from('projects')
        .insert(baseProject)
        .select()
        .single());
    }

    if (error) {
      if (error.message.includes('Could not find the table')) {
        return NextResponse.json(
          {
            error: 'Database not initialized',
            message: 'Please initialize your database first',
            redirect: '/setup',
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ...project, isOwner: true, isShared: false }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}