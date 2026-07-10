-- Project sharing and completed status support
-- Run in Supabase SQL Editor

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

-- priorityZone already supports arbitrary VARCHAR values; 'completed' is a valid zone