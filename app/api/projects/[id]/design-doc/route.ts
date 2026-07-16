/**
 * Generate Project Design Document API
 * Uses Grok's reasoning model with project notes as primary source material.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessProject } from '@/lib/project-access';
import {
  buildDesignDocumentPrompt,
  DESIGN_DOC_SYSTEM_PROMPT,
  getDesignDocBody,
  nextDesignDocVersion,
  withDesignDocMetadata,
  type DesignDocNote,
} from '@/lib/design-doc';
import { getErrorMessage } from '@/lib/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!process.env.XAI_API_KEY) {
      return NextResponse.json(
        {
          error: 'API configuration error',
          message: 'xAI API key is not configured',
        },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json().catch(() => ({}));
    const baseContent =
      typeof body.baseContent === 'string' && body.baseContent.trim()
        ? body.baseContent
        : undefined;

    const allowed = await canAccessProject(supabase, user.id, projectId);
    if (!allowed) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, description')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Load notes + existing design doc in parallel. Notes are the main AI input.
    const [{ data: noteRows, error: notesError }, { data: existingDoc }] =
      await Promise.all([
        supabase
          .from('project_notes')
          .select('content, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true }),
        supabase
          .from('project_design_docs')
          .select('content')
          .eq('project_id', projectId)
          .maybeSingle(),
      ]);

    if (notesError) {
      throw new Error(`Failed to load project notes: ${notesError.message}`);
    }

    const notes: DesignDocNote[] = (noteRows ?? [])
      .map((row) => ({
        content: String(row.content ?? '').trim(),
        createdAt: row.created_at ? String(row.created_at) : undefined,
      }))
      .filter((n) => n.content.length > 0);

    const versionSource = baseContent ?? existingDoc?.content;
    const version = versionSource ? nextDesignDocVersion(versionSource) : '1.0';

    const previousRaw = baseContent ?? existingDoc?.content ?? '';
    const previousDesignDoc = previousRaw ? getDesignDocBody(previousRaw) : undefined;

    const prompt = buildDesignDocumentPrompt({
      projectName: project.name,
      projectDescription: project.description?.trim() ?? '',
      projectId: project.id,
      version,
      notes,
      previousDesignDoc,
    });

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || 'grok-4-1-fast-reasoning',
        messages: [
          {
            role: 'system',
            content: DESIGN_DOC_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const apiMessage =
        (errorData as { error?: { message?: string } })?.error?.message ||
        'Unknown error';
      throw new Error(`Grok API error: ${response.status} - ${apiMessage}`);
    }

    const data = await response.json();
    const generatedBody = data.choices?.[0]?.message?.content || '';
    if (!generatedBody.trim()) {
      throw new Error('Grok returned an empty design document.');
    }

    const document = withDesignDocMetadata(generatedBody, {
      projectName: project.name,
      version,
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        document,
        version,
        notesUsed: notes.length,
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Design document generation error:', error);
    const message = getErrorMessage(error);

    if (message.includes('XAI_API_KEY')) {
      return NextResponse.json(
        {
          error: 'API configuration error',
          message: 'xAI API key is not configured',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
