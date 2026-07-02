-- Quick Update Script for Existing Databases
-- This script updates existing databases to use the new Links structure with Groups

-- First, drop the old links table if it exists and has the old structure
DROP TABLE IF EXISTS links CASCADE;

-- Create link_groups table
CREATE TABLE IF NOT EXISTS link_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  "order" INT DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS link_groups_userId_idx ON link_groups("userId");

-- Create new links table with group structure
CREATE TABLE IF NOT EXISTS links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "groupId" UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now(),
  FOREIGN KEY ("groupId") REFERENCES link_groups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS links_groupId_idx ON links("groupId");

-- Enable RLS if not already enabled
ALTER TABLE link_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own link groups" ON link_groups;
DROP POLICY IF EXISTS "Users can insert their own link groups" ON link_groups;
DROP POLICY IF EXISTS "Users can update their own link groups" ON link_groups;
DROP POLICY IF EXISTS "Users can delete their own link groups" ON link_groups;
DROP POLICY IF EXISTS "Users can view links in their groups" ON links;
DROP POLICY IF EXISTS "Users can insert links in their groups" ON links;
DROP POLICY IF EXISTS "Users can delete links in their groups" ON links;

-- RLS Policies for link_groups
CREATE POLICY "Users can view their own link groups"
  ON link_groups FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "Users can insert their own link groups"
  ON link_groups FOR INSERT
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own link groups"
  ON link_groups FOR UPDATE
  USING (auth.uid() = "userId")
  WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can delete their own link groups"
  ON link_groups FOR DELETE
  USING (auth.uid() = "userId");

-- RLS Policies for links
CREATE POLICY "Users can view links in their groups"
  ON links FOR SELECT
  USING (
    "groupId" IN (
      SELECT id FROM link_groups WHERE auth.uid() = "userId"
    )
  );

CREATE POLICY "Users can insert links in their groups"
  ON links FOR INSERT
  WITH CHECK (
    "groupId" IN (
      SELECT id FROM link_groups WHERE auth.uid() = "userId"
    )
  );

CREATE POLICY "Users can delete links in their groups"
  ON links FOR DELETE
  USING (
    "groupId" IN (
      SELECT id FROM link_groups WHERE auth.uid() = "userId"
    )
  );

-- Create triggers for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_link_groups_updated_at ON link_groups;
CREATE TRIGGER update_link_groups_updated_at
BEFORE UPDATE ON link_groups
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_links_updated_at ON links;
CREATE TRIGGER update_links_updated_at
BEFORE UPDATE ON links
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Verify the tables were created
SELECT
  'link_groups' as table_name,
  (SELECT count(*) FROM link_groups) as row_count
UNION ALL
SELECT
  'links' as table_name,
  (SELECT count(*) FROM links) as row_count;

