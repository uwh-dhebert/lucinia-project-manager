import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';
import { mapTaskRow, normalizeDueDate, type TaskRow } from '@/lib/tasks';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // RLS only returns rows the caller owns or is assigned to, so a miss here
    // means either not found or no access — 404 either way.
    const { data: existing, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, dueDate, assigneeId, completed } = body as {
      title?: string;
      description?: string;
      dueDate?: string | null;
      assigneeId?: string | null;
      completed?: boolean;
    };

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof title === 'string') {
      if (!title.trim()) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      updates.title = title.trim();
    }
    if (description !== undefined) {
      updates.description = typeof description === 'string' ? description.trim() || null : null;
    }
    if (dueDate !== undefined) {
      updates.due_date = normalizeDueDate(dueDate);
    }
    if (assigneeId !== undefined) {
      // Reassigning is re-sharing: only the owner may change who a task is
      // assigned to. An assignee can update the task but not hand it off.
      if (existing.owner_id !== user.id) {
        return NextResponse.json(
          { error: 'Only the task owner can change the assignee' },
          { status: 403 }
        );
      }
      updates.assignee_id = (typeof assigneeId === 'string' && assigneeId.trim()) || null;
    }
    if (typeof completed === 'boolean') {
      updates.completed = completed;
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ task: mapTaskRow(data as TaskRow, user.id) });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: existing, error: fetchError } = await supabase
      .from('tasks')
      .select('owner_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    if (existing.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the task owner can delete this task' },
        { status: 403 }
      );
    }

    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
