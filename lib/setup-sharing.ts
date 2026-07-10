import postgres from 'postgres';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL,
  "addedBy" UUID NOT NULL,
  "createdAt" TIMESTAMP DEFAULT now(),
  UNIQUE("projectId", "userId")
);

CREATE INDEX IF NOT EXISTS project_members_projectId_idx ON project_members("projectId");
CREATE INDEX IF NOT EXISTS project_members_userId_idx ON project_members("userId");

GRANT ALL ON project_members TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
`;

export async function ensureProjectSharingTable(): Promise<{ created: boolean; message: string }> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  const db = postgres(databaseUrl, { ssl: 'require', max: 1 });

  try {
    await db.unsafe(MIGRATION_SQL);
    return { created: true, message: 'Project sharing is configured' };
  } finally {
    await db.end();
  }
}

export function isSharingTableMissingError(message?: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('could not find the table') ||
    lower.includes('does not exist') ||
    lower.includes('schema cache') ||
    lower.includes('project_members')
  );
}