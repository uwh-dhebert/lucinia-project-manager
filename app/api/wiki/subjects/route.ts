import { createClient } from '@/utils/supabase/server'
import { ownsTopic } from '@/lib/wiki-access'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { topicId, title } = body

    if (!topicId || !title) {
      return NextResponse.json(
        { error: 'Topic ID and title are required' },
        { status: 400 }
      )
    }

    // Never let a subject be hung off someone else's topic
    if (!(await ownsTopic(supabase, user.id, topicId))) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')

    // Get the next order value for this topic
    const { data: lastSubject } = await supabase
      .from('subjects')
      .select('order')
      .eq('topicId', topicId)
      .order('order', { ascending: false })
      .limit(1)

    const order = (lastSubject?.[0]?.order ?? 0) + 1

    // Create subject
    const subjectId = randomUUID()
    const now = new Date().toISOString()

    const { data: subject, error } = await supabase
      .from('subjects')
      .insert({
        id: subjectId,
        topicId,
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

    return NextResponse.json(subject, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

