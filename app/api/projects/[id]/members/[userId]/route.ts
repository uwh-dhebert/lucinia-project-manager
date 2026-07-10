import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isProjectOwner } from '@/lib/project-access';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, userId: memberUserId } = await params;
    const owner = await isProjectOwner(supabase, user.id, projectId);

    if (!owner) {
      return NextResponse.json({ error: 'Only the project owner can remove members' }, { status: 403 });
    }

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('projectId', projectId)
      .eq('userId', memberUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}