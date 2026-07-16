import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

// Creates topics + subjects + content items from a client-parsed .onepkg
// (see lib/onepkg). Mapping: section group -> topic, section -> subject,
// page -> content item. The browser does the heavy parsing; this route only
// receives the extracted text, so large notebooks never hit upload limits.

const MAX_TOPICS = 100
const MAX_SUBJECTS = 1000
const MAX_ITEMS = 5000
const MAX_TEXT_PER_ITEM = 500_000

interface ImportItem {
  title?: string | null
  text: string
}
interface ImportSubject {
  title: string
  items: ImportItem[]
}
interface ImportTopic {
  title: string
  subjects: ImportSubject[]
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'section'
  )
}

function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = base
  for (let n = 2; taken.has(slug); n++) {
    slug = `${base}-${n}`
  }
  taken.add(slug)
  return slug
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const topics: ImportTopic[] = Array.isArray(body.topics) ? body.topics : []

    if (topics.length === 0) {
      return NextResponse.json({ error: 'No topics to import' }, { status: 400 })
    }
    if (topics.length > MAX_TOPICS) {
      return NextResponse.json({ error: `Too many topics (max ${MAX_TOPICS})` }, { status: 400 })
    }

    let subjectCount = 0
    let itemCount = 0
    for (const topic of topics) {
      if (typeof topic.title !== 'string' || !topic.title.trim()) {
        return NextResponse.json({ error: 'Every topic needs a title' }, { status: 400 })
      }
      if (!Array.isArray(topic.subjects)) {
        return NextResponse.json({ error: 'Every topic needs subjects' }, { status: 400 })
      }
      for (const subject of topic.subjects) {
        subjectCount++
        if (typeof subject.title !== 'string' || !subject.title.trim()) {
          return NextResponse.json({ error: 'Every subject needs a title' }, { status: 400 })
        }
        if (!Array.isArray(subject.items)) {
          return NextResponse.json({ error: 'Every subject needs items' }, { status: 400 })
        }
        for (const item of subject.items) {
          itemCount++
          if (typeof item.text !== 'string' || item.text.length > MAX_TEXT_PER_ITEM) {
            return NextResponse.json({ error: 'Item text missing or too large' }, { status: 400 })
          }
        }
      }
    }
    if (subjectCount > MAX_SUBJECTS || itemCount > MAX_ITEMS) {
      return NextResponse.json({ error: 'Import too large' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Existing topic slugs (unique per user) so imports never collide.
    const { data: existingTopics } = await supabase
      .from('topics')
      .select('slug')
      .eq('userId', user.id)

    const takenTopicSlugs = new Set((existingTopics ?? []).map((t) => t.slug))

    const { data: lastTopic } = await supabase
      .from('topics')
      .select('order')
      .eq('userId', user.id)
      .order('order', { ascending: false })
      .limit(1)
    let nextTopicOrder = (lastTopic?.[0]?.order ?? 0) + 1

    const topicRows: any[] = []
    const subjectRows: any[] = []
    const contentRows: any[] = []

    for (const topic of topics) {
      const topicId = randomUUID()
      topicRows.push({
        id: topicId,
        userId: user.id,
        title: topic.title.trim(),
        slug: uniqueSlug(slugify(topic.title), takenTopicSlugs),
        order: nextTopicOrder++,
        createdAt: now,
        updatedAt: now,
      })

      const takenSubjectSlugs = new Set<string>()
      topic.subjects.forEach((subject, subjectIndex) => {
        const subjectId = randomUUID()
        subjectRows.push({
          id: subjectId,
          topicId,
          title: subject.title.trim(),
          slug: uniqueSlug(slugify(subject.title), takenSubjectSlugs),
          order: subjectIndex + 1,
          createdAt: now,
          updatedAt: now,
        })

        subject.items.forEach((item, itemIndex) => {
          contentRows.push({
            id: randomUUID(),
            subjectId,
            title: item.title?.trim() || null,
            content:
              item.text ||
              '_No text could be extracted from this page._',
            order: itemIndex + 1,
            createdAt: now,
            updatedAt: now,
          })
        })

        if (subject.items.length === 0) {
          contentRows.push({
            id: randomUUID(),
            subjectId,
            title: null,
            content:
              '_No pages could be extracted from this section. If it was password-protected in OneNote, remove the password and re-export the notebook._',
            order: 1,
            createdAt: now,
            updatedAt: now,
          })
        }
      })
    }

    const createdTopicIds = topicRows.map((t) => t.id)
    const rollback = async () => {
      await supabase.from('topics').delete().in('id', createdTopicIds)
    }

    const { error: topicError } = await supabase.from('topics').insert(topicRows)
    if (topicError) {
      return NextResponse.json({ error: topicError.message }, { status: 500 })
    }

    const { error: subjectError } = await supabase.from('subjects').insert(subjectRows)
    if (subjectError) {
      await rollback()
      return NextResponse.json({ error: subjectError.message }, { status: 500 })
    }

    // Content can be large — insert in chunks.
    for (let i = 0; i < contentRows.length; i += 200) {
      const { error: contentError } = await supabase
        .from('content_items')
        .insert(contentRows.slice(i, i + 200))
      if (contentError) {
        await rollback()
        return NextResponse.json({ error: contentError.message }, { status: 500 })
      }
    }

    return NextResponse.json(
      {
        topicCount: topicRows.length,
        subjectCount: subjectRows.length,
        itemCount: contentRows.length,
        message: `Imported ${topicRows.length} topic${topicRows.length === 1 ? '' : 's'}, ${subjectRows.length} subject${subjectRows.length === 1 ? '' : 's'}, ${contentRows.length} page${contentRows.length === 1 ? '' : 's'}.`,
      },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
