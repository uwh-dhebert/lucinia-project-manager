import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';

// Reorder / move wiki nodes, mirroring /api/links/reorder.
//
// Body: {
//   topics:       [{ id, order }],
//   subjects:     [{ id, order, topicId? }],    // topicId = move to another topic
//   contentItems: [{ id, order, subjectId? }],  // subjectId = move to another subject
// }
// Every touched row (and every move target) must belong to the caller.

interface OrderItem {
  id: string;
  order: number;
}
interface SubjectOrderItem extends OrderItem {
  topicId?: string;
}
interface ContentOrderItem extends OrderItem {
  subjectId?: string;
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'section'
  );
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const topics: OrderItem[] = Array.isArray(body.topics) ? body.topics : [];
    const subjects: SubjectOrderItem[] = Array.isArray(body.subjects) ? body.subjects : [];
    const contentItems: ContentOrderItem[] = Array.isArray(body.contentItems)
      ? body.contentItems
      : [];

    if (topics.length === 0 && subjects.length === 0 && contentItems.length === 0) {
      return NextResponse.json(
        { error: 'Provide topics, subjects and/or contentItems to reorder' },
        { status: 400 }
      );
    }
    for (const item of [...topics, ...subjects, ...contentItems]) {
      if (!item?.id || typeof item.order !== 'number') {
        return NextResponse.json({ error: 'Invalid reorder item' }, { status: 400 });
      }
    }

    const now = new Date().toISOString();

    // The set of topics this user owns is the authority for every check below.
    const { data: ownedTopicRows, error: topicsError } = await supabase
      .from('topics')
      .select('id')
      .eq('userId', user.id);
    if (topicsError) throw new Error(topicsError.message);
    const ownedTopics = new Set((ownedTopicRows ?? []).map((t) => t.id));

    // --- topics ---
    if (topics.length > 0) {
      if (topics.some((t) => !ownedTopics.has(t.id))) {
        return NextResponse.json(
          { error: 'Unauthorized to reorder one or more topics' },
          { status: 403 }
        );
      }
      const results = await Promise.all(
        topics.map((item) =>
          supabase
            .from('topics')
            .update({ order: item.order, updatedAt: now })
            .eq('id', item.id)
            .eq('userId', user.id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);
    }

    // --- subjects ---
    if (subjects.length > 0) {
      const { data: subjectRows, error } = await supabase
        .from('subjects')
        .select('id, topicId, title, slug')
        .in(
          'id',
          subjects.map((s) => s.id)
        );
      if (error) throw new Error(error.message);

      const byId = new Map((subjectRows ?? []).map((row) => [row.id, row]));
      for (const item of subjects) {
        const row = byId.get(item.id);
        if (!row || !ownedTopics.has(row.topicId)) {
          return NextResponse.json(
            { error: 'Unauthorized to reorder one or more subjects' },
            { status: 403 }
          );
        }
        if (item.topicId && !ownedTopics.has(item.topicId)) {
          return NextResponse.json(
            { error: 'Unauthorized target topic' },
            { status: 403 }
          );
        }
      }

      for (const item of subjects) {
        const row = byId.get(item.id)!;
        const patch: { order: number; updatedAt: string; topicId?: string; slug?: string } = {
          order: item.order,
          updatedAt: now,
        };

        if (item.topicId && item.topicId !== row.topicId) {
          patch.topicId = item.topicId;

          // Slugs are unique per topic — moving into a topic that already has
          // this slug needs a suffix.
          const { data: siblingRows, error: siblingError } = await supabase
            .from('subjects')
            .select('slug')
            .eq('topicId', item.topicId)
            .neq('id', item.id);
          if (siblingError) throw new Error(siblingError.message);

          const taken = new Set((siblingRows ?? []).map((s) => s.slug));
          if (taken.has(row.slug)) {
            const base = slugify(row.title);
            let slug = base;
            for (let n = 2; taken.has(slug); n++) {
              slug = `${base}-${n}`;
            }
            patch.slug = slug;
          }
        }

        const { error: updateError } = await supabase
          .from('subjects')
          .update(patch)
          .eq('id', item.id);
        if (updateError) throw new Error(updateError.message);
      }
    }

    // --- content items ---
    if (contentItems.length > 0) {
      const { data: contentRows, error } = await supabase
        .from('content_items')
        .select('id, subjectId, subject:subjects!inner(topicId)')
        .in(
          'id',
          contentItems.map((c) => c.id)
        );
      if (error) throw new Error(error.message);

      const byId = new Map(
        (contentRows ?? []).map((row) => {
          const subject = row.subject as { topicId?: string } | { topicId?: string }[] | null;
          const topicId = Array.isArray(subject) ? subject[0]?.topicId : subject?.topicId;
          return [row.id as string, { topicId }];
        })
      );

      // Any subject named as a move target must belong to one of the user's topics.
      const targetSubjectIds = contentItems
        .map((c) => c.subjectId)
        .filter((id): id is string => Boolean(id));
      const ownedTargetSubjects = new Set<string>();
      if (targetSubjectIds.length > 0) {
        const { data: targetRows, error: targetError } = await supabase
          .from('subjects')
          .select('id, topicId')
          .in('id', targetSubjectIds);
        if (targetError) throw new Error(targetError.message);
        for (const row of targetRows ?? []) {
          if (ownedTopics.has(row.topicId)) ownedTargetSubjects.add(row.id);
        }
      }

      for (const item of contentItems) {
        const owned = byId.get(item.id);
        if (!owned?.topicId || !ownedTopics.has(owned.topicId)) {
          return NextResponse.json(
            { error: 'Unauthorized to reorder one or more content items' },
            { status: 403 }
          );
        }
        if (item.subjectId && !ownedTargetSubjects.has(item.subjectId)) {
          return NextResponse.json(
            { error: 'Unauthorized target subject' },
            { status: 403 }
          );
        }
      }

      const results = await Promise.all(
        contentItems.map((item) => {
          const patch: { order: number; updatedAt: string; subjectId?: string } = {
            order: item.order,
            updatedAt: now,
          };
          if (item.subjectId) {
            patch.subjectId = item.subjectId;
          }
          return supabase.from('content_items').update(patch).eq('id', item.id);
        })
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Wiki reorder error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
