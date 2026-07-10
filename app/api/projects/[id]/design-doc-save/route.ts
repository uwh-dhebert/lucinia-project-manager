/**
 * Save Project Design Document API
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessProject } from '@/lib/project-access';
import {
  parseDesignDocVersion,
  withDesignDocMetadata,
} from '@/lib/design-doc';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { content } = body as { content?: string };

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('ownerId, name')
      .eq('id', projectId)
      .single();

    const allowed = await canAccessProject(supabase, user.id, projectId);
    if (projectError || !project || !allowed) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if design doc already exists
    const { data: existingDoc } = await supabase
      .from('project_design_docs')
      .select('id, content')
      .eq('project_id', projectId)
      .maybeSingle();

    const savedAt = new Date();
    const normalizedContent = withDesignDocMetadata(content, {
      projectName: project.name,
      version: parseDesignDocVersion(content),
      updatedAt: savedAt,
    });

    let result;
    if (existingDoc) {
      const { data, error } = await supabase
        .from('project_design_docs')
        .update({ content: normalizedContent, updated_at: savedAt.toISOString() })
        .eq('project_id', projectId)
        .select()
        .single();
      result = { data, error };
    } else {
      // Create new
      const { data, error } = await supabase
        .from('project_design_docs')
        .insert({
          project_id: projectId,
          content: normalizedContent,
        })
        .select()
        .single();
      result = { data, error };
    }

    if (result.error) {
      console.error('Database error:', result.error);
      throw new Error(result.error.message);
    }

    return NextResponse.json(
      {
        success: true,
        designDoc: result.data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error saving design doc:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('ownerId')
      .eq('id', projectId)
      .single();

    const allowed = await canAccessProject(supabase, user.id, projectId);
    if (projectError || !project || !allowed) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }

    // Fetch design doc
    const { data, error } = await supabase
      .from('project_design_docs')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        designDoc: data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching design doc:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

