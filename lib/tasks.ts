// Standalone task list. A task belongs to its creator (owner_id) and can be
// assigned to one other user (assignee_id). Assigning a task to someone else
// IS how it is shared: the assignee gains read/write access to that task, both
// through the API's owner-or-assignee filter and through RLS on the table.

export interface TaskRow {
  id: string;
  owner_id: string;
  assignee_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null; // 'YYYY-MM-DD'
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  ownerId: string;
  assigneeId: string;
  title: string;
  description: string;
  dueDate: string; // 'YYYY-MM-DD' or ''
  completed: boolean;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

export function mapTaskRow(row: TaskRow, currentUserId: string): Task {
  return {
    id: row.id,
    ownerId: row.owner_id,
    assigneeId: row.assignee_id ?? '',
    title: row.title,
    description: row.description ?? '',
    dueDate: row.due_date ?? '',
    completed: !!row.completed,
    isOwner: row.owner_id === currentUserId,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Date helpers — the calendar defaults to a 7-day week starting Monday, with
// the Mon–Fri work week highlighted and the weekend muted.
// ---------------------------------------------------------------------------

export const WEEK_LENGTH = 7;
export const WORK_WEEK_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri (Date.getDay values)

/** Local 'YYYY-MM-DD' key for a Date (no timezone shift). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Midnight-local Date for the Monday of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

/** The 7 Date objects (Mon→Sun) for the week containing `date`. */
export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: WEEK_LENGTH }, (_, i) => addDays(start, i));
}

export function isWorkDay(date: Date): boolean {
  return WORK_WEEK_DAYS.includes(date.getDay());
}

export function isSameDate(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

/** Validate a 'YYYY-MM-DD' string; returns the normalized value or null. */
export function normalizeDueDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const parsed = new Date(`${value.trim()}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return value.trim();
}
