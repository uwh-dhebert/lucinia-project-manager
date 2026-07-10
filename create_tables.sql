-- Create project_design_docs table
CREATE TABLE IF NOT EXISTS project_design_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index on project_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_design_docs_project_id ON project_design_docs(project_id);

-- Create project_stories table
CREATE TABLE IF NOT EXISTS project_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  acceptance_criteria text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on project_id
CREATE INDEX IF NOT EXISTS idx_project_stories_project_id ON project_stories(project_id);

-- Create project_notes table
CREATE TABLE IF NOT EXISTS project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on project_id
CREATE INDEX IF NOT EXISTS idx_project_notes_project_id ON project_notes(project_id);

-- Create project_summaries table
CREATE TABLE IF NOT EXISTS project_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_summaries_project_id ON project_summaries(project_id);

-- Create project_todos table
CREATE TABLE IF NOT EXISTS project_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES project_todos(id) ON DELETE CASCADE,
  title text NOT NULL,
  link_url text,
  completed boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  story_id uuid,
  item_type varchar(50) DEFAULT 'custom',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_todos_project_id ON project_todos(project_id);
CREATE INDEX IF NOT EXISTS idx_project_todos_parent_id ON project_todos(parent_id);

