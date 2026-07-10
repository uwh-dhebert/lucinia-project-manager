import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { isProjectOwner } from '@/lib/project-access';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const owner = await isProjectOwner(supabase, user.id, projectId);

    if (!owner) {
      return NextResponse.json({ error: 'Only the project owner can view members' }, { status: 403 });
    }

    const { data: members, error } = await supabase
      .from('project_members')
      .select('id, userId, addedBy, createdAt')
      .eq('projectId', projectId)
      .order('createdAt', { ascending: true });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('could not find the table') || msg.includes('schema cache') || msg.includes('does not exist')) {
        return NextResponse.json({ members: [], tableMissing: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const admin = createAdminClient();
    const enriched = await Promise.all(
      (members ?? []).map(async (member) => {
        const { data: authData } = await admin.auth.admin.getUserById(member.userId);
        return {
          ...member,
          email: authData.user?.email ?? 'Unknown',
          fullName:
            (authData.user?.user_metadata?.full_name as string | undefined) ??
            (authData.user?.user_metadata?.name as string | undefined) ??
            null,
        };
      })
    );

    return NextResponse.json({ members: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const owner = await isProjectOwner(supabase, user.id, projectId);

    if (!owner) {
      return NextResponse.json({ error: 'Only the project owner can share projects' }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot share a project with yourself' }, { status: 400 });
    }

    const { data: project } = await supabase
      .from('projects')
      .select('ownerId')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.ownerId === userId) {
      return NextResponse.json({ error: 'User is already the project owner' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: targetUser, error: userError } = await admin.auth.admin.getUserById(userId);

    if (userError || !targetUser.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: member, error } = await supabase
      .from('project_members')
      .insert({
        id: randomUUID(),
        projectId,
        userId,
        addedBy: user.id,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        return NextResponse.json({ error: 'User already has access to this project' }, { status: 409 });
      }
      if (error.message.includes('Could not find the table')) {
        return NextResponse.json(
          { error: 'Sharing not configured. Run PROJECT_SHARING.sql in Supabase.' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        ...member,
        email: targetUser.user.email,
        fullName:
          (targetUser.user.user_metadata?.full_name as string | undefined) ??
          (targetUser.user.user_metadata?.name as string | undefined) ??
          null,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}