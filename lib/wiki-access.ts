import type { SupabaseClient } from '@supabase/supabase-js';

// The wiki is strictly private: a topic belongs to exactly one user and is never
// shared. Unlike projects, there is no membership table and no 'member' role.
//
// Ownership is stored only on `topics`. Subjects and content items inherit it
// through topicId / subjectId, mirroring how links inherit from link_groups.

export type WikiNodeType = 'topic' | 'subject' | 'contentItem';

export async function ownsTopic(
  supabase: SupabaseClient,
  userId: string,
  topicId: string
): Promise<boolean> {
  const { data: topic } = await supabase
    .from('topics')
    .select('id')
    .eq('id', topicId)
    .eq('userId', userId)
    .maybeSingle();

  return topic !== null;
}

export async function ownsSubject(
  supabase: SupabaseClient,
  userId: string,
  subjectId: string
): Promise<boolean> {
  const { data: subject } = await supabase
    .from('subjects')
    .select('topicId')
    .eq('id', subjectId)
    .maybeSingle();

  if (!subject) return false;
  return ownsTopic(supabase, userId, subject.topicId as string);
}

export async function ownsContentItem(
  supabase: SupabaseClient,
  userId: string,
  contentItemId: string
): Promise<boolean> {
  const { data: item } = await supabase
    .from('content_items')
    .select('subjectId')
    .eq('id', contentItemId)
    .maybeSingle();

  if (!item) return false;
  return ownsSubject(supabase, userId, item.subjectId as string);
}

// `/api/wiki/[id]` is polymorphic -- the UI posts topic ids and subject ids to it.
// Resolve what the id actually refers to, considering only nodes this user owns,
// so an id belonging to someone else is indistinguishable from one that does not exist.
export async function resolveOwnedWikiNode(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<WikiNodeType | null> {
  if (await ownsTopic(supabase, userId, id)) return 'topic';
  if (await ownsSubject(supabase, userId, id)) return 'subject';
  if (await ownsContentItem(supabase, userId, id)) return 'contentItem';
  return null;
}
