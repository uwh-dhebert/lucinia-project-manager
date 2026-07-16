import { createClient } from '@/utils/supabase/server'
import { resolveOwnedWikiNode } from '@/lib/wiki-access'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // The UI posts both topic ids and subject ids here, so work out which this is.
    // Ids the user does not own resolve to null and are reported as 404, so a
    // probe cannot distinguish another user's content from a nonexistent id.
    const nodeType = await resolveOwnedWikiNode(supabase, user.id, id)

    if (!nodeType) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const table = {
      topic: 'topics',
      subject: 'subjects',
      contentItem: 'content_items',
    }[nodeType]

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
