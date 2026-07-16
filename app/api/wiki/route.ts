import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const treeOnly = request.nextUrl.searchParams.get('tree') === 'true';

    // Sidebar/tree views only need metadata — skip heavy content bodies
    const selectQuery = treeOnly
      ? 'id, title, slug, order, subjects(id, title, slug, order, contentItems:content_items(id, title, order))'
      : '*, subjects(*, contentItems:content_items(*))';

    const { data: topics, error } = await supabase
      .from('topics')
      .select(selectQuery)
      .eq('userId', user.id)
      .order('order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // PostgREST does not order embedded resources — sort the nested tree here
    // so drag-and-drop ordering is respected everywhere.
    const byOrder = (a: { order?: number }, b: { order?: number }) =>
      (a.order ?? 0) - (b.order ?? 0)
    const sorted = (topics ?? []).map((topic: any) => ({
      ...topic,
      subjects: (topic.subjects ?? [])
        .map((subject: any) => ({
          ...subject,
          contentItems: [...(subject.contentItems ?? [])].sort(byOrder),
        }))
        .sort(byOrder),
    }))

    return NextResponse.json(sorted)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Topic title is required' },
        { status: 400 }
      )
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')

    // Get the next order value within this user's own wiki
    const { data: lastTopic } = await supabase
      .from('topics')
      .select('order')
      .eq('userId', user.id)
      .order('order', { ascending: false })
      .limit(1)

    const order = (lastTopic?.[0]?.order ?? 0) + 1

    // Create topic
    const topicId = randomUUID()
    const now = new Date().toISOString()

    const { data: topic, error } = await supabase
      .from('topics')
      .insert({
        id: topicId,
        userId: user.id,
        title,
        slug,
        order,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(topic, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

