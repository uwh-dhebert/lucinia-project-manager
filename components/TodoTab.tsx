'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import type { TodoItem } from '@/lib/project-todos';

interface TodoTabProps {
  projectId: string;
}

export function TodoTab({ projectId }: TodoTabProps) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const autoInitAttempted = useRef(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<string, string>>({});

  const loadTodos = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let response = await fetch(`/api/projects/${projectId}/todos`);
      let data: { todos?: TodoItem[]; tableMissing?: boolean; error?: string } =
        await response.json().catch(() => ({}));

      if (response.ok && data.tableMissing) {
        const setupRes = await fetch('/api/setup-todos', { method: 'POST' });
        if (!setupRes.ok) {
          setTodos([]);
          return;
        }
        response = await fetch(`/api/projects/${projectId}/todos`);
        data = await response.json().catch(() => ({}));
      }

      if (response.ok) {
        setTodos(data.todos ?? []);
        return;
      }

      if (response.status === 404) {
        setTodos([]);
        return;
      }
      const message = data.error || '';
      if (
        message.toLowerCase().includes('could not find the table') ||
        message.toLowerCase().includes('schema cache') ||
        message.toLowerCase().includes('does not exist')
      ) {
        setTodos([]);
        return;
      }

      setError(message || 'Failed to load todos');
    } catch {
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const handleInitializeTodos = useCallback(async () => {
    setInitializing(true);
    setError('');

    try {
      await fetch('/api/setup-todos', { method: 'POST' });
      const response = await fetch(`/api/projects/${projectId}/todos/initialize`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to set up todo list');
      }

      const data = await response.json();
      setTodos(data.todos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up todo list');
    } finally {
      setInitializing(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  useEffect(() => {
    if (loading || initializing || autoInitAttempted.current || error) return;

    const hasTopLevelTodos = todos.some((todo) => !todo.parentId);
    if (!hasTopLevelTodos) {
      autoInitAttempted.current = true;
      void handleInitializeTodos();
    }
  }, [loading, initializing, error, todos, handleInitializeTodos]);

  const topLevelTodos = useMemo(
    () => todos.filter((todo) => !todo.parentId),
    [todos]
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string, TodoItem[]>();
    for (const todo of todos) {
      if (!todo.parentId) continue;
      const list = map.get(todo.parentId) ?? [];
      list.push(todo);
      map.set(todo.parentId, list);
    }
    return map;
  }, [todos]);

  const handleToggle = async (todo: TodoItem) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed }),
      });

      if (!response.ok) throw new Error('Failed to update todo');
      const data = await response.json();
      setTodos((prev) => prev.map((item) => (item.id === todo.id ? data.todo : item)));
    } catch {
      setError('Failed to update task');
    }
  };

  const handleDelete = async (todoId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/todos/${todoId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete todo');
      await loadTodos();
    } catch {
      setError('Failed to delete task');
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle.trim() }),
      });

      if (!response.ok) throw new Error('Failed to add task');
      const data = await response.json();
      setTodos((prev) => [...prev, data.todo]);
      setNewTaskTitle('');
    } catch {
      setError('Failed to add task');
    }
  };

  const handleAddSubtask = async (parentId: string) => {
    const title = newSubtaskTitles[parentId]?.trim();
    if (!title) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, parentId }),
      });

      if (!response.ok) throw new Error('Failed to add subtask');
      const data = await response.json();
      setTodos((prev) => [...prev, data.todo]);
      setNewSubtaskTitles((prev) => ({ ...prev, [parentId]: '' }));
    } catch {
      setError('Failed to add subtask');
    }
  };

  const handleRefreshStoryList = async () => {
    setSyncing(true);
    setError('');

    try {
      const response = await fetch(`/api/projects/${projectId}/todos/sync-stories`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to refresh story list');
      }

      const data = await response.json();
      setTodos(data.todos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh story list');
    } finally {
      setSyncing(false);
    }
  };

  if (loading || initializing) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lucina-secondary" />
        <p className="text-lucina-muted mt-2">
          {initializing ? 'Setting up todo list...' : 'Loading todos...'}
        </p>
      </div>
    );
  }

  if (topLevelTodos.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-lucina-primary">Project Todo List</h3>
          <p className="text-sm text-lucina-muted mt-1">
            Track Confluence publishing and story creation tasks
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="text-center py-12 border border-dashed border-lucina-rose rounded-xl">
          <div className="text-4xl mb-4">✅</div>
          <h4 className="text-lg font-semibold text-lucina-primary mb-2">No todo list yet</h4>
          <p className="text-lucina-muted mb-6 max-w-md mx-auto">
            Set up your project todo list with the Confluence design doc task and story
            subtasks you can sync from the Stories tab.
          </p>
          <button
            type="button"
            onClick={() => void handleInitializeTodos()}
            className="px-6 py-2 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors"
          >
            Set Up Todo List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="text-xl font-bold text-lucina-primary">Project Todo List</h3>
          <p className="text-sm text-lucina-muted mt-1">
            Track Confluence publishing and story creation tasks
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefreshStoryList}
          disabled={syncing}
          className="shrink-0 px-4 py-2 bg-lucina-rose text-lucina-primary rounded-lg hover:bg-lucina-rose-hover transition-colors font-medium disabled:opacity-50"
        >
          {syncing ? 'Refreshing...' : '🔄 Refresh Story List'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {topLevelTodos.map((todo) => {
          const children = childrenByParent.get(todo.id) ?? [];

          return (
            <div
              key={todo.id}
              className="bg-lucina-surface border border-lucina-rose rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => void handleToggle(todo)}
                  className="mt-1 h-4 w-4 rounded border-lucina-rose text-lucina-secondary focus:ring-lucina-secondary"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-medium ${
                        todo.completed
                          ? 'text-lucina-muted line-through'
                          : 'text-lucina-primary'
                      }`}
                    >
                      {todo.title}
                    </span>
                    {todo.linkUrl && (
                      <a
                        href={todo.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-lucina-secondary hover:underline"
                      >
                        Open in Confluence
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>

                  {children.length > 0 && (
                    <ul className="mt-3 space-y-2 pl-1">
                      {children.map((child) => (
                        <li key={child.id} className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={child.completed}
                            onChange={() => void handleToggle(child)}
                            className="mt-1 h-4 w-4 rounded border-lucina-rose text-lucina-secondary focus:ring-lucina-secondary"
                          />
                          <span
                            className={`flex-1 text-sm ${
                              child.completed
                                ? 'text-lucina-muted line-through'
                                : 'text-lucina-primary'
                            }`}
                          >
                            {child.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleDelete(child.id)}
                            className="text-lucina-muted hover:text-red-600 transition-colors"
                            aria-label={`Delete ${child.title}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={newSubtaskTitles[todo.id] ?? ''}
                      onChange={(e) =>
                        setNewSubtaskTitles((prev) => ({
                          ...prev,
                          [todo.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleAddSubtask(todo.id);
                      }}
                      placeholder="Add subtask..."
                      className="flex-1 px-3 py-2 text-sm border border-lucina-rose rounded-lg bg-lucina-white text-lucina-primary placeholder-lucina-muted focus:outline-none focus:ring-2 focus:ring-lucina-secondary"
                    />
                    <button
                      type="button"
                      onClick={() => void handleAddSubtask(todo.id)}
                      className="px-3 py-2 text-sm bg-lucina-white border border-lucina-rose rounded-lg hover:bg-lucina-rose-hover transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(todo.id)}
                  className="text-lucina-muted hover:text-red-600 transition-colors shrink-0"
                  aria-label={`Delete ${todo.title}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleAddTask();
          }}
          placeholder="Add a new task..."
          className="flex-1 px-3 py-2 border border-lucina-rose rounded-lg bg-lucina-white text-lucina-primary placeholder-lucina-muted focus:outline-none focus:ring-2 focus:ring-lucina-secondary"
        />
        <button
          type="button"
          onClick={() => void handleAddTask()}
          className="px-4 py-2 bg-lucina-rose text-lucina-primary rounded-lg hover:bg-lucina-rose-hover transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>
    </div>
  );
}