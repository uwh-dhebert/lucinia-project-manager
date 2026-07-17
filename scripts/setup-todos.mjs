import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');

function loadEnv() {
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnv();
const databaseUrl = env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const migrationSql = `
CREATE TABLE IF NOT EXISTS project_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES project_todos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  link_url TEXT,
  completed BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  story_id UUID,
  item_type VARCHAR(50) DEFAULT 'custom',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_todos_project_id ON project_todos(project_id);
CREATE INDEX IF NOT EXISTS idx_project_todos_parent_id ON project_todos(parent_id);
CREATE INDEX IF NOT EXISTS idx_project_todos_story_id ON project_todos(story_id);

GRANT ALL ON project_todos TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
`;

const db = postgres(databaseUrl, { ssl: 'require', max: 1 });

try {
  await db.unsafe(migrationSql);
  console.log('✓ project_todos table is ready');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  await db.end();
}