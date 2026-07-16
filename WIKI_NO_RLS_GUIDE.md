# Wiki Setup — superseded

> **Do not disable RLS on the wiki tables.**
>
> This guide used to tell you to run `ALTER TABLE subjects DISABLE ROW LEVEL SECURITY`.
> That is what made the wiki **global**: every logged-in user could read, edit and
> delete every other user's topics, subjects and content.
>
> The correct setup is **`WIKI_PER_USER.sql`**.

## What actually went wrong

`DATABASE_SETUP.sql` ran `ENABLE ROW LEVEL SECURITY` on `topics`, `subjects` and
`content_items` but never created a single **policy** for them.

RLS with no policies denies everything. So the wiki looked broken, and the fix
applied at the time was to switch RLS off — which turned "nobody can read it" into
"everybody can read everyone's". The real fix is to enable RLS *and write the policies*.

## Setup

1. Go to https://supabase.com/dashboard → **SQL Editor** → **New Query**
2. Run `WIKI_RESTRUCTURE_NO_RLS.sql` **only if the wiki tables do not exist yet**
   (it creates `topics` / `subjects` / `content_items`; ignore its `DISABLE ROW LEVEL SECURITY`
   lines — the next step reverses them)
3. Run **`WIKI_PER_USER.sql`**. This is the one that matters. It:
   - adds `topics."userId"` and backfills existing rows to a single owner
   - makes topic slugs unique **per user** instead of globally
   - enables RLS on all three wiki tables **with owner-only policies**
   - revokes wiki access from the `anon` role
4. Refresh your browser.

`WIKI_PER_USER.sql` is safe to re-run.

## Verifying

The bottom of `WIKI_PER_USER.sql` prints a check. Every wiki table must report
`rls_enabled = true` with `policy_count = 4`. If any row shows `false` or `0`,
the wiki is still shared and the migration did not finish.

## Ownership model

The wiki is **strictly private and cannot be shared** — there is no membership
table, no share link, no public flag, and no `is_public` column.

Ownership lives on `topics` only. `subjects` and `content_items` inherit it through
`topicId` / `subjectId`, the same way `links` inherit from `link_groups`
(see `UPDATE_LINKS_STRUCTURE.sql`). If you ever add a wiki table, it must inherit
ownership the same way and get its own policies.
