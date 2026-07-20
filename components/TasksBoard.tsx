'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { getUserDisplayName, type AppUser } from '@/lib/users';
import { TaskModal } from '@/components/TaskModal';
import {
  addDays,
  isSameDate,
  isWorkDay,
  toDateKey,
  weekDays,
  type Task,
} from '@/lib/tasks';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatRange(days: Date[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  const month = (d: Date) => d.toLocaleDateString(undefined, { month: 'short' });
  const sameMonth = first.getMonth() === last.getMonth();
  const left = `${month(first)} ${first.getDate()}`;
  const right = sameMonth ? `${last.getDate()}` : `${month(last)} ${last.getDate()}`;
  return `${left} – ${right}, ${last.getFullYear()}`;
}

function assigneeLabel(task: Task, users: AppUser[]): string | null {
  if (!task.assigneeId) return null;
  const user = users.find((u) => u.id === task.assigneeId);
  return user ? getUserDisplayName(user) : 'Assigned';
}

function TaskCard({
  task,
  users,
  onToggle,
  onClick,
}: {
  task: Task;
  users: AppUser[];
  onToggle: (task: Task) => void;
  onClick: (task: Task) => void;
}) {
  const assignee = assigneeLabel(task, users);

  return (
    <div
      className={`group rounded-lg border border-lucina-rose bg-lucina-white p-2 shadow-sm transition-shadow hover:border-lucina-secondary hover:shadow-md ${
        task.completed ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-lucina-secondary"
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        />
        <button
          type="button"
          onClick={() => onClick(task)}
          className="min-w-0 flex-1 text-left"
        >
          <span
            className={`block text-sm font-medium text-lucina-primary ${
              task.completed ? 'line-through' : ''
            }`}
          >
            {task.title}
          </span>
          {assignee && (
            <span className="mt-1 inline-block max-w-full truncate rounded-full bg-lucina-surface px-2 py-0.5 text-[11px] font-medium text-lucina-secondary">
              {task.isOwner ? `→ ${assignee}` : 'Shared with you'}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export function TasksBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [modal, setModal] = useState<{ open: boolean; task: Task | null; dueDate: string }>({
    open: false,
    task: null,
    dueDate: '',
  });

  const today = useMemo(() => new Date(), []);
  const days = useMemo(() => weekDays(anchor), [anchor]);

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load tasks');
        return;
      }
      setTasks(data.tasks as Task[]);
      setError('');
    } catch {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users?includeSelf=true');
      if (res.ok) setUsers((await res.json()) as AppUser[]);
    } catch {
      // non-fatal — assignee names just fall back to a generic label
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, [loadTasks, loadUsers]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const list = map.get(task.dueDate) ?? [];
      list.push(task);
      map.set(task.dueDate, list);
    }
    return map;
  }, [tasks]);

  const unscheduled = useMemo(() => tasks.filter((t) => !t.dueDate), [tasks]);

  const toggleComplete = async (task: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    );
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      });
      if (!res.ok) loadTasks();
    } catch {
      loadTasks();
    }
  };

  const openNew = (dueDate = '') => setModal({ open: true, task: null, dueDate });
  const openEdit = (task: Task) => setModal({ open: true, task, dueDate: '' });
  const closeModal = () => setModal({ open: false, task: null, dueDate: '' });

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lucina-secondary" />
        <p className="text-lucina-muted mt-2">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-lucina-primary">Tasks</h1>
          <p className="text-lucina-muted mt-2">
            Assign a task to a teammate to share it. Due dates show on the week calendar.
          </p>
        </div>
        <button
          onClick={() => openNew()}
          className="flex items-center gap-2 px-6 py-2.5 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors shadow-lg hover:shadow-xl"
        >
          <Plus className="h-4 w-4" /> New Task
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnchor((d) => addDays(d, -7))}
            className="rounded-full border border-lucina-rose p-2 text-lucina-secondary hover:bg-lucina-surface transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="rounded-full border border-lucina-rose px-4 py-2 text-sm font-medium text-lucina-secondary hover:bg-lucina-surface transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setAnchor((d) => addDays(d, 7))}
            className="rounded-full border border-lucina-rose p-2 text-lucina-secondary hover:bg-lucina-surface transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <span className="text-sm font-semibold text-lucina-primary">{formatRange(days)}</span>
      </div>

      {/* 7-day week calendar; Mon–Fri work week highlighted, weekend muted */}
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[840px] grid-cols-7 gap-3">
          {days.map((day) => {
            const key = toDateKey(day);
            const dayTasks = tasksByDay.get(key) ?? [];
            const workDay = isWorkDay(day);
            const isToday = isSameDate(day, today);

            return (
              <div key={key} className="flex flex-col">
                <div
                  className={`mb-2 rounded-lg px-2 py-1.5 text-center ${
                    workDay ? 'bg-lucina-secondary/10' : 'bg-transparent'
                  } ${isToday ? 'ring-2 ring-lucina-secondary' : ''}`}
                >
                  <div
                    className={`text-xs font-bold uppercase tracking-wide ${
                      workDay ? 'text-lucina-secondary' : 'text-lucina-muted'
                    }`}
                  >
                    {DAY_NAMES[day.getDay()]}
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      workDay ? 'text-lucina-primary' : 'text-lucina-muted'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>

                <div
                  className={`flex min-h-[160px] flex-1 flex-col gap-2 rounded-xl border p-2 transition-colors ${
                    workDay
                      ? 'border-lucina-rose bg-lucina-surface/50'
                      : 'border-lucina-rose/40 bg-lucina-accent/40'
                  }`}
                >
                  {dayTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      users={users}
                      onToggle={toggleComplete}
                      onClick={openEdit}
                    />
                  ))}
                  <button
                    onClick={() => openNew(key)}
                    className="mt-auto flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-lucina-muted hover:bg-lucina-white hover:text-lucina-secondary transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unscheduled tasks (no due date) */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-lucina-secondary">
          Unscheduled
          <span className="ml-2 rounded-full bg-lucina-surface px-2 py-0.5 text-xs font-normal text-lucina-muted">
            {unscheduled.length}
          </span>
        </h2>
        {unscheduled.length === 0 ? (
          <p className="text-sm text-lucina-muted">No unscheduled tasks. Nice and tidy.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unscheduled.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                users={users}
                onToggle={toggleComplete}
                onClick={openEdit}
              />
            ))}
          </div>
        )}
      </div>

      <TaskModal
        isOpen={modal.open}
        task={modal.task}
        initialDueDate={modal.dueDate}
        users={users}
        onClose={closeModal}
        onSaved={loadTasks}
      />
    </div>
  );
}
