import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessProject } from '@/lib/project-access';
import {
  buildProjectSummaryPrompt,
  gatherProjectSummaryContext,
} from '@/lib/project-summary';
import { saveProjectSummary } from '@/lib/project-summary-server';
import { getErrorMessage } from '@/lib/errors';
import { ensureProjectSummaryTable, isSummaryTableMissingError } from '@/lib/setup-summary';
import { GrokService } from '@/infrastructure/external/GrokService';

async function getProjectForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  projectId: string
) {
  const allowed = await canAccessProject(supabase, userId, projectId);
  if (!allowed) return null;

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, description')
    .eq('id', projectId)
    .single();

  if (error || !project) return null;
  return project;
}

export async function GET(
  _request: NextRequest,
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
    const project = await getProjectForUser(supabase, user.id, projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('project_summaries')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) {
      if (isSummaryTableMissingError(error.message)) {
        return NextResponse.json({ summary: null, tableMissing: true });
      }
      throw error;
    }

    return NextResponse.json({ summary: data });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
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
    const project = await getProjectForUser(supabase, user.id, projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    try {
      await ensureProjectSummaryTable();
    } catch {
      // Table may already exist; save step will retry if needed.
    }

    const context = await gatherProjectSummaryContext(supabase, projectId, project);
    const prompt = buildProjectSummaryPrompt(context);

    const grokService = new GrokService();
    const completion = await grokService.chat({
      messages: [{ role: 'user', content: prompt }],
      systemPrompt:
        'You are a concise technical writer. Produce clear Markdown summaries grounded only in the provided project material.',
      model: process.env.XAI_MODEL_LITE || 'grok-4-1-fast-non-reasoning',
      temperature: 0.4,
      max_tokens: 2048,
    });

    const content = completion.content.trim();
    if (!content) {
      return NextResponse.json({ error: 'Summary generation returned empty content' }, { status: 500 });
    }

    const summary = await saveProjectSummary(supabase, projectId, content);

    return NextResponse.json({
      success: true,
      summary,
      model: completion.model,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);

    if (message.includes('XAI_API_KEY')) {
      return NextResponse.json(
        { error: 'xAI API key is not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}