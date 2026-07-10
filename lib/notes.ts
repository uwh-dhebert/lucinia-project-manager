export interface NoteRecord {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export function mapNoteRow(row: Record<string, unknown>): NoteRecord {
  return {
    id: String(row.id),
    content: String(row.content ?? ''),
    createdAt: String(row.created_at ?? row.createdAt ?? ''),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? row.created_at ?? row.createdAt ?? ''),
  };
}

export function formatNoteTimestamp(value?: string): string {
  if (!value) return 'Unknown date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}