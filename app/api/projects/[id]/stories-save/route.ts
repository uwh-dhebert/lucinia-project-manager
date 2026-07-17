/**
 * Project Stories CRUD API
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { canAccessProject } from '@/lib/project-access';
import { mapStoryRow } from '@/lib/project-stories';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Verify project exists and user owns it
    const { data: project } = await supabase
      .from('projects')
      .select('ownerId')
      .eq('id', projectId)
      .single();

    const allowed = await canAccessProject(supabase, user.id, projectId);
    if (!project || !allowed) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }

    // Fetch stories
    const { data: stories, error } = await supabase
      .from('project_stories')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      stories: (stories ?? []).map((story) => mapStoryRow(story as Record<string, unknown>)),
    });
  } catch (error: any) {
    console.error('Error fetching stories:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { stories } = body;

    if (!Array.isArray(stories)) {
      return NextResponse.json(
        { error: 'Stories must be an array' },
        { status: 400 }
      );
    }

    // Verify project exists and user owns it
    const { data: project } = await supabase
      .from('projects')
      .select('ownerId')
      .eq('id', projectId)
      .single();

    const allowed = await canAccessProject(supabase, user.id, projectId);
    if (!project || !allowed) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }

    // Manual saves default to source=manual so regenerate will not wipe them.
    const storiesData = stories.map((story: {
      title?: string;
      description?: string;
      acceptanceCriteria?: string[];
      source?: string;
    }) => ({
      id: randomUUID(),
      project_id: projectId,
      title: story.title,
      description: story.description,
      acceptance_criteria: story.acceptanceCriteria || [],
      source: story.source === 'generated' ? 'generated' : 'manual',
    }));

    const insert = async () => {
      const { data: insertedStories, error } = await supabase
        .from('project_stories')
        .insert(storiesData)
        .select();
      if (error) throw error;
      return insertedStories;
    };

    let insertedStories;
    try {
      insertedStories = await insert();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.toLowerCase().includes('source') &&
        (message.toLowerCase().includes('column') ||
          message.toLowerCase().includes('schema cache'))
      ) {
        const { ensureStorySourceColumn } = await import('@/lib/setup-stories-source');
        await ensureStorySourceColumn();
        insertedStories = await insert();
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      stories: (insertedStories ?? []).map((story) =>
        mapStoryRow(story as Record<string, unknown>)
      ),
    });
  } catch (error: any) {
    console.error('Error saving stories:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { storyId, title, description, acceptanceCriteria } = body;

    if (!storyId) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }

    const allowed = await canAccessProject(supabase, user.id, projectId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update story, scoped to this project so a body-supplied storyId cannot
    // reach another project's stories.
    const { data: updatedStory, error } = await supabase
      .from('project_stories')
      .update({
        title,
        description,
        acceptance_criteria: acceptanceCriteria,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storyId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      story: mapStoryRow(updatedStory as Record<string, unknown>),
    });
  } catch (error: any) {
    console.error('Error updating story:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { storyId } = body;

    if (!storyId) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }

    const allowed = await canAccessProject(supabase, user.id, projectId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete story, scoped to this project so a body-supplied storyId cannot
    // reach another project's stories.
    const { error } = await supabase
      .from('project_stories')
      .delete()
      .eq('id', storyId)
      .eq('project_id', projectId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting story:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

