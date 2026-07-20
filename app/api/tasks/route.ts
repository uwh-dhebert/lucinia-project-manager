import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getErrorMessage } from '@/lib/errors';
import { mapTaskRow, normalizeDueDate, type TaskRow } from '@/lib/tasks';
import { ensureTasksTable, isTasksTableMissingError } from '@/lib/setup-tasks';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Tasks you own OR are assigned to. RLS enforces the same rule; this filter
    // keeps the intent explicit and independent of RLS being present.
    const query = () =>
      supabase
        .from('tasks')
        .select('*')
        .or(`owner_id.eq.${user.id},assignee_id.eq.${user.id}`)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

    let { data, error } = await query();

    if (error && isTasksTableMissingError(error.message)) {
      await ensureTasksTable();
      ({ data, error } = await query());
    }

    if (error) throw error;

    const tasks = (data as TaskRow[]).map((row) => mapTaskRow(row, user.id));
    return NextResponse.json({ tasks });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, dueDate, assigneeId } = body as {
      title?: string;
      description?: string;
      dueDate?: string | null;
      assigneeId?: string | null;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const record = {
      id: randomUUID(),
      owner_id: user.id,
      assignee_id: assigneeId?.trim() || null,
      title: title.trim(),
      description: description?.trim() || null,
      due_date: normalizeDueDate(dueDate),
      completed: false,
    };

    const insert = () => supabase.from('tasks').insert(record).select().single();

    let { data, error } = await insert();

    if (error && isTasksTableMissingError(error.message)) {
      await ensureTasksTable();
      ({ data, error } = await insert());
    }

    if (error) throw error;

    return NextResponse.json({ task: mapTaskRow(data as TaskRow, user.id) }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
