# Links API Error - Fix Guide

## The Problem

You're seeing this error:
```
POST /api/links/groups 500 in 215ms
failed to create group
```

This means the API endpoint is failing when trying to create a link group.

## Root Cause

The database tables `link_groups` and the updated `links` table don't exist yet in your Supabase database.

## Solution - Choose One Option Below

### ✅ Option 1: Fresh Database Setup (Recommended)

If you haven't created any links yet, use the complete DATABASE_SETUP.sql:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your `lucina-project-manager` project
3. Click **SQL Editor** in the left sidebar
4. Click **+ New Query**
5. Open and copy the entire contents of:
   ```
   DATABASE_SETUP.sql
   ```
6. Paste into the SQL Editor
7. Click **Run** (or Ctrl+Enter)
8. Wait for success message
9. Restart your app

**Time**: 2-3 minutes

---

### ✅ Option 2: Update Existing Database

If you have existing data and want to preserve the database structure:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your `lucina-project-manager` project
3. Click **SQL Editor** in the left sidebar
4. Click **+ New Query**
5. Open and copy the entire contents of:
   ```
   UPDATE_LINKS_STRUCTURE.sql
   ```
6. Paste into the SQL Editor
7. Click **Run** (or Ctrl+Enter)
8. Wait for success message (should see row counts for both tables)
9. Restart your app

**Time**: 1-2 minutes
**Preserves**: All existing data from other tables

---

### ✅ Option 3: Manual SQL Commands

If you prefer to run individual commands:

```sql
-- Drop old links table
DROP TABLE IF EXISTS links CASCADE;

-- Create link_groups table
CREATE TABLE link_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  "order" INT DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);

CREATE INDEX link_groups_userId_idx ON link_groups("userId");

-- Create new links table
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "groupId" UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now(),
  FOREIGN KEY ("groupId") REFERENCES link_groups(id) ON DELETE CASCADE
);

CREATE INDEX links_groupId_idx ON links("groupId");
```

**Time**: 1 minute
**Steps**: Copy/paste, run, done

---

## After Running the Migration

### Step 1: Verify Tables Were Created

1. In Supabase, go to **Table Editor** (left sidebar)
2. You should see:
   - ✅ `link_groups` table (empty)
   - ✅ `links` table (empty)

### Step 2: Restart Your Application

```powershell
# Stop your app (Ctrl+C)
# Then restart it
npm run dev
# or
bun dev
```

### Step 3: Test the Feature

1. Navigate to your app at `http://localhost:3000`
2. Go to the **Links** page
3. Click **+ Add Group**
4. Enter a group name (e.g., "Dev Tools")
5. Click **Create**

You should now see the group appear without errors!

---

## If You Still Get an Error

### Check 1: Verify Tables Exist
```sql
-- Run this in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('link_groups', 'links')
ORDER BY table_name;
```

You should see 2 results: `link_groups` and `links`

### Check 2: View Database Console
1. In Supabase, go to **Table Editor**
2. Click on `link_groups`
3. You should see column headers: id, userId, name, order, createdAt, updatedAt
4. Click on `links`
5. You should see column headers: id, groupId, title, url, createdAt, updatedAt

### Check 3: Check Browser Console
1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Look for any error messages
4. Share these errors for debugging

### Check 4: Restart App & Browser
```powershell
# In terminal
Ctrl+C  # Stop the app

# Clear browser cache
# Press Ctrl+Shift+Delete to open clear browsing data

# Restart app
npm run dev
```

---

## File Reference

These are the files related to the links feature:

**Database:**
- `DATABASE_SETUP.sql` - Complete database setup (use this first time)
- `UPDATE_LINKS_STRUCTURE.sql` - Just the links tables update

**Code:**
- `app/(protected)/links/page.tsx` - Main links page
- `app/api/links/route.ts` - Create link
- `app/api/links/[id]/route.ts` - Delete link
- `app/api/links/groups/route.ts` - Get/create groups
- `app/api/links/groups/[id]/route.ts` - Delete group
- `components/CreateLinkGroupModal.tsx` - Group creation modal
- `components/CreateLinkModal.tsx` - Link creation modal

---

## Quick Checklist

- [ ] I've identified which SQL file to use (Option 1, 2, or 3)
- [ ] I've opened Supabase SQL Editor
- [ ] I've copied the SQL content
- [ ] I've pasted it into SQL Editor
- [ ] I've clicked "Run" button
- [ ] I've verified tables exist in Table Editor
- [ ] I've restarted my app
- [ ] I've tested by creating a group

---

## Still Stuck?

If you're still getting errors after following these steps:

1. **Read the browser console** - there will be a detailed error message
2. **Check Supabase logs** - Project Settings → Logs
3. **Verify your credentials** - Make sure `.env.local` has correct DATABASE_URL
4. **Try from scratch** - Use DATABASE_SETUP.sql again

The most common issue is forgetting to **restart the app** after running SQL.

---

**Key Points:**
- ✅ The SQL creates the necessary tables
- ✅ The API code is ready to use
- ✅ Just need to run the SQL and restart
- ✅ No code changes needed (already done)

You're almost there! Just run one of the SQL files above and you'll be good to go. 🚀

