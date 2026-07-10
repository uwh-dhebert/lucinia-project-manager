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

const sqlPath = path.join(__dirname, '..', 'PROJECT_SHARING.sql');
let migrationSql = fs.readFileSync(sqlPath, 'utf-8');
if (!migrationSql.includes('NOTIFY pgrst')) {
  migrationSql += '\nGRANT ALL ON project_members TO anon, authenticated, service_role;\nNOTIFY pgrst, \'reload schema\';\n';
}

const db = postgres(databaseUrl, { ssl: 'require', max: 1 });

try {
  console.log('Creating project_members table...');
  await db.unsafe(migrationSql);
  console.log('Sharing setup complete.');
} catch (error) {
  console.error('Setup failed:', error.message);
  process.exit(1);
} finally {
  await db.end();
}