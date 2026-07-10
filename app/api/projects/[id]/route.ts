import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { PRIORITY_ZONES, type PriorityZone } from '@/lib/project-priorities'
import { canAccessProject, getProjectAccess, isProjectOwner } from '@/lib/project-access'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const access = await getProjectAccess(supabase, user.id, projectId)
    if (!access) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, responsible, priorityZone } = body

    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('ownerId, priorityZone')
      .eq('id', projectId)
      .single()

    if (fetchError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const updates: Record<string, string | number> = { updatedAt: now }

    if (typeof name === 'string' && name.trim()) {
      updates.name = name.trim()
    }
    if (description !== undefined) {
      updates.description = description
    }
    if (typeof responsible === 'string') {
      updates.responsible = responsible.trim()
    }
    if (typeof priorityZone === 'string' && PRIORITY_ZONES.includes(priorityZone as PriorityZone)) {
      updates.priorityZone = priorityZone

      if (priorityZone !== project.priorityZone) {
        const { data: zoneProjects } = await supabase
          .from('projects')
          .select('priorityOrder')
          .eq('priorityZone', priorityZone)
          .order('priorityOrder', { ascending: false })
          .limit(1)

        updates.priorityOrder =
          zoneProjects?.[0]?.priorityOrder != null
            ? zoneProjects[0].priorityOrder + 1
            : 0
      }
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ...updated,
      isOwner: project.ownerId === user.id,
      isShared: project.ownerId !== user.id,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

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

    const { id: projectId } = await params

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const owner = await isProjectOwner(supabase, user.id, projectId)
    if (!owner) {
      return NextResponse.json({ error: 'Only the project owner can delete this project' }, { status: 403 })
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}