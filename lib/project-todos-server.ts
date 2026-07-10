import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import {
  buildStorySubtaskTitle,
  CONFLUENCE_DESIGN_DOC_URL,
  CONFLUENCE_TASK_TITLE,
  mapTodoRow,
  STORIES_PARENT_TITLE,
  type TodoItem,
} from '@/lib/project-todos';
import { getErrorMessage } from '@/lib/errors';
import { ensureProjectTodosTable, isTodosTableMissingError } from '@/lib/setup-todos';

async function withTodosTable<T>(
  supabase: SupabaseClient,
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = getErrorMessage(error);
    if (!isTodosTableMissingError(message)) throw error;
    await ensureProjectTodosTable();
    return operation();
  }
}

export async function listProjectTodos(
  supabase: SupabaseClient,
  projectId: string
): Promise<TodoItem[]> {
  return withTodosTable(supabase, async () => {
    await ensureDefaultTodos(supabase, projectId);
    return listProjectTodosWithoutInit(supabase, projectId);
  });
}

export async function initializeProjectTodos(
  supabase: SupabaseClient,
  projectId: string
): Promise<TodoItem[]> {
  return withTodosTable(supabase, async () => {
    await ensureDefaultTodos(supabase, projectId);
    return listProjectTodosWithoutInit(supabase, projectId);
  });
}

async function listProjectTodosWithoutInit(
  supabase: SupabaseClient,
  projectId: string
): Promise<TodoItem[]> {
  const { data, error } = await supabase
    .from('project_todos')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => mapTodoRow(row as Record<string, unknown>));
}

async function ensureDefaultTodos(supabase: SupabaseClient, projectId: string) {
  const { data: existing, error } = await supabase
    .from('project_todos')
    .select('id, item_type')
    .eq('project_id', projectId);

  if (error) throw error;

  const types = new Set((existing ?? []).map((row) => row.item_type as string));
  const inserts = [];

  if (!types.has('confluence')) {
    inserts.push({
      id: randomUUID(),
      project_id: projectId,
      parent_id: null,
      title: CONFLUENCE_TASK_TITLE,
      link_url: CONFLUENCE_DESIGN_DOC_URL,
      completed: false,
      sort_order: 0,
      story_id: null,
      item_type: 'confluence',
    });
  }

  if (!types.has('stories_parent')) {
    inserts.push({
      id: randomUUID(),
      project_id: projectId,
      parent_id: null,
      title: STORIES_PARENT_TITLE,
      link_url: null,
      completed: false,
      sort_order: 1,
      story_id: null,
      item_type: 'stories_parent',
    });
  }

  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from('project_todos').insert(inserts);
    if (insertError) throw insertError;
  }
}

export async function syncStoryTodoSubtasks(
  supabase: SupabaseClient,
  projectId: string
): Promise<TodoItem[]> {
  return withTodosTable(supabase, async () => {
    await ensureDefaultTodos(supabase, projectId);

    const todos = await listProjectTodos(supabase, projectId);
    const storiesParent = todos.find((todo) => todo.itemType === 'stories_parent');
    if (!storiesParent) {
      throw new Error('Stories parent todo is missing');
    }

    const { data: stories, error: storiesError } = await supabase
      .from('project_stories')
      .select('id, title')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (storiesError) throw storiesError;

    const storyIds = new Set((stories ?? []).map((story) => String(story.id)));
    const existingStoryTodos = todos.filter(
      (todo) => todo.itemType === 'story' && todo.parentId === storiesParent.id
    );

    const toRemove = existingStoryTodos.filter((todo) => todo.storyId && !storyIds.has(todo.storyId));
    if (toRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('project_todos')
        .delete()
        .in(
          'id',
          toRemove.map((todo) => todo.id)
        );
      if (deleteError) throw deleteError;
    }

    const existingByStoryId = new Map(
      existingStoryTodos
        .filter((todo) => todo.storyId)
        .map((todo) => [todo.storyId as string, todo])
    );

    const inserts = [];
    const updates = [];

    for (const [index, story] of (stories ?? []).entries()) {
      const storyId = String(story.id);
      const title = buildStorySubtaskTitle(String(story.title ?? 'Untitled story'));
      const existing = existingByStoryId.get(storyId);

      if (!existing) {
        inserts.push({
          id: randomUUID(),
          project_id: projectId,
          parent_id: storiesParent.id,
          title,
          link_url: null,
          completed: false,
          sort_order: index,
          story_id: storyId,
          item_type: 'story',
        });
      } else if (existing.title !== title) {
        updates.push({ id: existing.id, title, sort_order: index });
      } else if (existing.sortOrder !== index) {
        updates.push({ id: existing.id, sort_order: index });
      }
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from('project_todos').insert(inserts);
      if (insertError) throw insertError;
    }

    for (const update of updates) {
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if ('title' in update && update.title !== undefined) patch.title = update.title;
      if ('sort_order' in update && update.sort_order !== undefined) {
        patch.sort_order = update.sort_order;
      }

      const { error: updateError } = await supabase
        .from('project_todos')
        .update(patch)
        .eq('id', update.id);
      if (updateError) throw updateError;
    }

    return listProjectTodos(supabase, projectId);
  });
}