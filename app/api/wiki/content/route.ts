import { createClient } from '@/utils/supabase/server'
import { ownsSubject } from '@/lib/wiki-access'
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
    const { subjectId, title, content } = body

    if (!subjectId || !content) {
      return NextResponse.json(
        { error: 'Subject ID and content are required' },
        { status: 400 }
      )
    }

    // Never let content be written into someone else's subject
    if (!(await ownsSubject(supabase, user.id, subjectId))) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    // Get the next order value for this subject
    const { data: lastItem } = await supabase
      .from('content_items')
      .select('order')
      .eq('subjectId', subjectId)
      .order('order', { ascending: false })
      .limit(1)

    const order = (lastItem?.[0]?.order ?? 0) + 1

    // Create content item
    const itemId = randomUUID()
    const now = new Date().toISOString()

    const { data: item, error } = await supabase
      .from('content_items')
      .insert({
        id: itemId,
        subjectId,
        title: title || undefined,
        content,
        order,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(item, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

