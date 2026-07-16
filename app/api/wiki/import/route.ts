import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

// Creates a topic + subjects + content items from a client-parsed .onepkg
// (see lib/onepkg). The browser does the heavy parsing; this route only
// receives the extracted text, so large notebooks never hit upload limits.

const MAX_SECTIONS = 500
const MAX_TEXT_PER_SECTION = 500_000

interface ImportSection {
  title: string
  text: string
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const notebookName = typeof body.notebookName === 'string' ? body.notebookName.trim() : ''
    const sections: ImportSection[] = Array.isArray(body.sections) ? body.sections : []

    if (!notebookName) {
      return NextResponse.json({ error: 'Notebook name is required' }, { status: 400 })
    }
    if (sections.length === 0) {
      return NextResponse.json({ error: 'No sections to import' }, { status: 400 })
    }
    if (sections.length > MAX_SECTIONS) {
      return NextResponse.json({ error: `Too many sections (max ${MAX_SECTIONS})` }, { status: 400 })
    }
    for (const section of sections) {
      if (typeof section.title !== 'string' || !section.title.trim()) {
        return NextResponse.json({ error: 'Every section needs a title' }, { status: 400 })
      }
      if (typeof section.text !== 'string' || section.text.length > MAX_TEXT_PER_SECTION) {
        return NextResponse.json({ error: 'Section text missing or too large' }, { status: 400 })
      }
    }

    const now = new Date().toISOString()

    // Topic slug must be unique per user — suffix if the notebook was
    // imported before.
    const baseSlug = slugify(notebookName)
    const { data: existingTopics } = await supabase
      .from('topics')
      .select('slug')
      .eq('userId', user.id)
      .like('slug', `${baseSlug}%`)

    const taken = new Set((existingTopics ?? []).map((t) => t.slug))
    let topicSlug = baseSlug
    for (let n = 2; taken.has(topicSlug); n++) {
      topicSlug = `${baseSlug}-${n}`
    }

    const { data: lastTopic } = await supabase
      .from('topics')
      .select('order')
      .eq('userId', user.id)
      .order('order', { ascending: false })
      .limit(1)

    const topicId = randomUUID()
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .insert({
        id: topicId,
        userId: user.id,
        title: notebookName,
        slug: topicSlug,
        order: (lastTopic?.[0]?.order ?? 0) + 1,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single()

    if (topicError) {
      return NextResponse.json({ error: topicError.message }, { status: 500 })
    }

    // Subjects preserve the notebook's original section order; slugs are
    // de-duplicated within the topic.
    const subjectSlugs = new Set<string>()
    const subjectRows = sections.map((section, index) => {
      const base = slugify(section.title)
      let slug = base
      for (let n = 2; subjectSlugs.has(slug); n++) {
        slug = `${base}-${n}`
      }
      subjectSlugs.add(slug)
      return {
        id: randomUUID(),
        topicId,
        title: section.title.trim(),
        slug,
        order: index + 1,
        createdAt: now,
        updatedAt: now,
      }
    })

    const { error: subjectError } = await supabase.from('subjects').insert(subjectRows)
    if (subjectError) {
      // Roll back the topic so a failed import leaves nothing behind.
      await supabase.from('topics').delete().eq('id', topicId)
      return NextResponse.json({ error: subjectError.message }, { status: 500 })
    }

    const contentRows = sections.map((section, index) => ({
      id: randomUUID(),
      subjectId: subjectRows[index].id,
      title: null,
      content:
        section.text ||
        '_No text could be extracted from this section. If it was password-protected in OneNote, remove the password and re-export the notebook._',
      order: 1,
      createdAt: now,
      updatedAt: now,
    }))

    const { error: contentError } = await supabase.from('content_items').insert(contentRows)
    if (contentError) {
      await supabase.from('topics').delete().eq('id', topicId)
      return NextResponse.json({ error: contentError.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        topic,
        subjectCount: subjectRows.length,
        message: `Imported "${notebookName}" with ${subjectRows.length} section${subjectRows.length === 1 ? '' : 's'}.`,
      },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
