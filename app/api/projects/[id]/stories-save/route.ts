/**
 * Project Stories CRUD API
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { canAccessProject } from '@/lib/project-access';

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

    return NextResponse.json({ stories: stories || [] });
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

    // Insert stories
    const storiesData = stories.map((story: any) => ({
      id: randomUUID(),
      project_id: projectId,
      title: story.title,
      description: story.description,
      acceptance_criteria: story.acceptanceCriteria || [],
    }));

    const { data: insertedStories, error } = await supabase
      .from('project_stories')
      .insert(storiesData)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      stories: insertedStories,
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

    const body = await request.json();
    const { storyId, title, description, acceptanceCriteria } = body;

    if (!storyId) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Update story
    const { data: updatedStory, error } = await supabase
      .from('project_stories')
      .update({
        title,
        description,
        acceptance_criteria: acceptanceCriteria,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storyId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      story: updatedStory,
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

    const body = await request.json();
    const { storyId } = body;

    if (!storyId) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Delete story
    const { error } = await supabase
      .from('project_stories')
      .delete()
      .eq('id', storyId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting story:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

