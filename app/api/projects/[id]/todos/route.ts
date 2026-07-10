import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { canAccessProject } from '@/lib/project-access';
import { mapTodoRow } from '@/lib/project-todos';
import { listProjectTodos } from '@/lib/project-todos-server';
import { getErrorMessage } from '@/lib/errors';
import { ensureProjectTodosTable, isTodosTableMissingError } from '@/lib/setup-todos';

export async function GET(
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

    const { id: projectId } = await params;
    const allowed = await canAccessProject(supabase, user.id, projectId);
    if (!allowed) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    try {
      const todos = await listProjectTodos(supabase, projectId);
      return NextResponse.json({ todos });
    } catch (error) {
      const message = getErrorMessage(error);
      if (isTodosTableMissingError(message)) {
        return NextResponse.json({ todos: [], tableMissing: true });
      }
      throw error;
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(
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

    const { id: projectId } = await params;
    const allowed = await canAccessProject(supabase, user.id, projectId);
    if (!allowed) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, parentId, linkUrl } = body as {
      title?: string;
      parentId?: string | null;
      linkUrl?: string | null;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('project_todos')
        .select('id')
        .eq('id', parentId)
        .eq('project_id', projectId)
        .maybeSingle();

      if (parentError) throw parentError;
      if (!parent) {
        return NextResponse.json({ error: 'Parent task not found' }, { status: 404 });
      }
    }

    const insert = async () => {
      const { data, error } = await supabase
        .from('project_todos')
        .insert({
          id: randomUUID(),
          project_id: projectId,
          parent_id: parentId ?? null,
          title: title.trim(),
          link_url: linkUrl?.trim() || null,
          completed: false,
          sort_order: 999,
          story_id: null,
          item_type: 'custom',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    };

    let row;
    try {
      row = await insert();
    } catch (error) {
      const message = getErrorMessage(error);
      if (isTodosTableMissingError(message)) {
        await ensureProjectTodosTable();
        row = await insert();
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      todo: mapTodoRow(row as Record<string, unknown>),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}