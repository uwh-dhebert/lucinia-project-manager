import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

/**
 * API Endpoint to initialize database tables
 * GET /api/init-db - Check if tables exist
 * POST /api/init-db - Create tables (requires admin access)
 */

const SQL_STATEMENTS = [
  'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',

  `CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    "userId" UUID NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    "fullName" VARCHAR(255),
    role VARCHAR(50) DEFAULT 'USER',
    status VARCHAR(50) DEFAULT 'PENDING',
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS access_requests (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    "fullName" VARCHAR(255),
    reason TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    "ownerId" UUID NOT NULL,
    responsible VARCHAR(255) DEFAULT '',
    "priorityZone" VARCHAR(50) DEFAULT 'in_design',
    "priorityOrder" INT DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    UNIQUE(slug, "ownerId")
  )`,

  `CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "projectId" UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    "userId" UUID NOT NULL,
    "addedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP DEFAULT now(),
    UNIQUE("projectId", "userId")
  )`,

  'CREATE INDEX IF NOT EXISTS project_members_projectId_idx ON project_members("projectId")',
  'CREATE INDEX IF NOT EXISTS project_members_userId_idx ON project_members("userId")',

  `CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "projectId" UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    "order" INT DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    UNIQUE(slug, "projectId"),
    FOREIGN KEY ("projectId") REFERENCES projects(id) ON DELETE CASCADE
  )`,

  'CREATE INDEX IF NOT EXISTS topics_projectId_idx ON topics("projectId")',

  `CREATE TABLE IF NOT EXISTS links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    url TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(255) DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now()
  )`,

  'CREATE INDEX IF NOT EXISTS links_userId_idx ON links("userId")',
  'CREATE INDEX IF NOT EXISTS links_category_idx ON links(category)',

  `CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    title VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now()
  )`,

  'CREATE INDEX IF NOT EXISTS chat_conversations_userId_idx ON chat_conversations("userId")',

  `CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "conversationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    content TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    "contextDocumentIds" TEXT[] DEFAULT '{}',
    tokens INT,
    model VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    FOREIGN KEY ("conversationId") REFERENCES chat_conversations(id) ON DELETE CASCADE
  )`,

  'CREATE INDEX IF NOT EXISTS chat_messages_conversationId_idx ON chat_messages("conversationId")',
  'CREATE INDEX IF NOT EXISTS chat_messages_userId_idx ON chat_messages("userId")',

  `CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "projectId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    "templateType" VARCHAR(255) NOT NULL,
    content TEXT,
    sections JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'draft',
    "generatedAt" TIMESTAMP DEFAULT now(),
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    FOREIGN KEY ("projectId") REFERENCES projects(id) ON DELETE CASCADE
  )`,

  'CREATE INDEX IF NOT EXISTS generated_documents_projectId_idx ON generated_documents("projectId")',
  'CREATE INDEX IF NOT EXISTS generated_documents_userId_idx ON generated_documents("userId")',
  'CREATE INDEX IF NOT EXISTS generated_documents_status_idx ON generated_documents(status)',

  `CREATE TABLE IF NOT EXISTS story_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "projectId" UUID,
    "storyId" VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    "currentSize" INT,
    "recommendedSize" VARCHAR(50) NOT NULL,
    confidence FLOAT NOT NULL,
    reasoning TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    accepted BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    FOREIGN KEY ("projectId") REFERENCES projects(id) ON DELETE SET NULL
  )`,

  'CREATE INDEX IF NOT EXISTS story_recommendations_userId_idx ON story_recommendations("userId")',
  'CREATE INDEX IF NOT EXISTS story_recommendations_projectId_idx ON story_recommendations("projectId")',
  'CREATE INDEX IF NOT EXISTS story_recommendations_accepted_idx ON story_recommendations(accepted)',

  `CREATE TABLE IF NOT EXISTS epics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "projectId" UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    FOREIGN KEY ("projectId") REFERENCES projects(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "epicId" UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    "acceptanceCriteria" TEXT[] DEFAULT '{}',
    "storyPoints" FLOAT NOT NULL,
    status VARCHAR(50) DEFAULT 'todo',
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    FOREIGN KEY ("epicId") REFERENCES epics(id) ON DELETE CASCADE
  )`,

]

export async function POST() {
  try {
    const supabase = await createClient()

    // Execute each SQL statement
    for (const statement of SQL_STATEMENTS) {
      try {
        const { error } = await supabase.rpc('exec', { sql: statement })
        if (error && !error.message?.includes('already exists')) {
          console.error('SQL error:', error)
        }
      } catch (error: any) {
        // Ignore "already exists" errors
        if (!error.message?.includes('already exists')) {
          console.error('SQL Error:', error.message)
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Database initialized successfully',
        tables: [
          'profiles',
          'access_requests',
          'projects',
          'topics',
          'links',
          'chat_conversations',
          'chat_messages',
          'generated_documents',
          'story_recommendations',
          'epics',
          'stories',
        ],
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Database initialization error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to initialize database',
        hint: 'Try using Supabase Dashboard > SQL Editor to run DATABASE_SETUP.sql',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Check if projects table exists by trying to query it
    const { data, error } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })

    // If we got a response (even if empty), table exists
    if (!error) {
      return NextResponse.json(
        {
          initialized: true,
          message: 'Database is ready',
        },
        { status: 200 }
      )
    }

    // Check error message more broadly
    if (error?.message && (error.message.includes('not found') || error.message.includes('does not exist'))) {
      return NextResponse.json(
        {
          initialized: false,
          message: 'Database tables not found',
          action: 'POST /api/init-db to initialize',
          error: error.message,
        },
        { status: 200 }
      )
    }

    // Some other error - might still be initialized
    console.error('DB check error:', error)
    return NextResponse.json(
      {
        initialized: false,
        error: error?.message || 'Unknown error checking database',
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Database check exception:', error)
    return NextResponse.json(
      {
        initialized: false,
        error: error.message || 'Failed to check database status',
      },
      { status: 200 }
    )
  }
}

