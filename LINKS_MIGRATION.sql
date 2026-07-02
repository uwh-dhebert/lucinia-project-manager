-- Create LinkGroup table
CREATE TABLE link_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on userId for faster queries
CREATE INDEX link_groups_user_id_idx ON link_groups("userId");

-- Drop old links table if it exists
DROP TABLE IF EXISTS links;

-- Create new links table with groupId
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "groupId" UUID NOT NULL REFERENCES link_groups(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on groupId for faster queries
CREATE INDEX links_group_id_idx ON links("groupId");

-- Create trigger to auto-update updatedAt for link_groups
CREATE OR REPLACE FUNCTION update_link_groups_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER link_groups_updated_at_trigger
BEFORE UPDATE ON link_groups
FOR EACH ROW
EXECUTE FUNCTION update_link_groups_timestamp();

-- Create trigger to auto-update updatedAt for links
CREATE OR REPLACE FUNCTION update_links_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER links_updated_at_trigger
BEFORE UPDATE ON links
FOR EACH ROW
EXECUTE FUNCTION update_links_timestamp();

