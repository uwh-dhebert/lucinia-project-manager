'use client';

import { useEffect, useRef, useState } from 'react';
import { UserSelect } from '@/components/UserSelect';
import type { AppUser } from '@/lib/users';
import type { Task } from '@/lib/tasks';

interface TaskModalProps {
  isOpen: boolean;
  /** Existing task to edit, or null when creating a new one. */
  task: Task | null;
  /** Pre-filled due date (YYYY-MM-DD) when adding from a calendar day. */
  initialDueDate?: string;
  users: AppUser[];
  onClose: () => void;
  onSaved: () => void;
}

export function TaskModal({
  isOpen,
  task,
  initialDueDate = '',
  users,
  onClose,
  onSaved,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);

  const isEdit = !!task;
  const isOwner = !task || task.isOwner;

  useEffect(() => {
    if (isOpen) {
      setTitle(task?.title ?? '');
      setDescription(task?.description ?? '');
      setDueDate(task?.dueDate ?? initialDueDate);
      setAssigneeId(task?.assigneeId ?? '');
      setError('');
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, task, initialDueDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setLoading(true);
    setError('');

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate || null,
    };
    // Only the owner can (re)assign — matches the API's rule.
    if (isOwner) payload.assigneeId = assigneeId || null;

    try {
      const response = await fetch(isEdit ? `/api/tasks/${task!.id}` : '/api/tasks', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save task');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete task');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/70 rounded-2xl shadow-2xl max-w-md w-full p-6 bg-lucina-white border border-lucina-rose"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-lucina-primary">
            {isEdit ? 'Edit Task' : 'New Task'}
          </h2>
          <p className="text-lucina-muted text-sm mt-1">
            Assign a task to a teammate to share it with them.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-lucina-primary mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
              className="w-full px-4 py-2 border border-lucina-rose rounded-xl focus:outline-none focus:ring-2 focus:ring-lucina-secondary focus:border-transparent bg-lucina-surface text-lucina-primary placeholder-lucina-muted"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-lucina-primary mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-lucina-rose rounded-xl focus:outline-none focus:ring-2 focus:ring-lucina-secondary focus:border-transparent bg-lucina-surface text-lucina-primary placeholder-lucina-muted resize-none"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-lucina-primary mb-2">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 border border-lucina-rose rounded-xl focus:outline-none focus:ring-2 focus:ring-lucina-secondary focus:border-transparent bg-lucina-surface text-lucina-primary"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-lucina-primary mb-2">
                Assign to {isOwner ? '(shares it)' : ''}
              </label>
              <UserSelect
                users={users}
                value={assigneeId}
                onChange={setAssigneeId}
                allowUnassigned
                unassignedLabel="Unassigned"
                className="w-full px-4 py-2 border border-lucina-rose rounded-xl focus:outline-none focus:ring-2 focus:ring-lucina-secondary focus:border-transparent bg-lucina-surface text-lucina-primary disabled:opacity-60"
                disabled={loading || !isOwner}
              />
            </div>
          </div>
          {!isOwner && (
            <p className="text-xs text-lucina-muted">
              This task was shared with you. Only its owner can change who it&apos;s assigned to.
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          {isEdit && task?.isOwner && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2.5 border border-red-300 text-red-600 font-medium rounded-full hover:bg-red-50 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-lucina-rose text-lucina-secondary font-medium rounded-full hover:bg-lucina-surface transition-colors disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Saving...' : isEdit ? 'Save' : 'Create Task'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
