/**
 * Generate Stories from Design Document API
 * Uses Grok's reasoning model to create stories from design doc
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessProject } from '@/lib/project-access';

interface GenerateStoriesRequest {
  designDoc: string;
}

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
    const body: GenerateStoriesRequest = await request.json();
    const { designDoc } = body;

    if (!designDoc) {
      return NextResponse.json(
        { error: 'Design document is required' },
        { status: 400 }
      );
    }

    // Verify project exists and user owns it
    const allowed = await canAccessProject(supabase, user.id, projectId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Prepare the prompt for story generation
    const prompt = buildStoriesPrompt(designDoc, project.name);

    // Call Grok with reasoning model for story generation
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
            content: `You are an expert software engineer and product manager. Generate well-formed user stories with clear acceptance criteria based on the design document provided. Return the stories as a JSON array with the specified format.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Grok API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
      );
    }

    const data = await response.json();
    const storiesText = data.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let stories;
    try {
      const jsonMatch = storiesText.match(/\[[\s\S]*\]/);
      stories = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (e) {
      console.error('Error parsing stories JSON:', e);
      stories = [];
    }

    return NextResponse.json(
      {
        success: true,
        stories,
        project: {
          id: project.id,
          name: project.name,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Story generation error:', error);

    if (error.message.includes('XAI_API_KEY')) {
      return NextResponse.json(
        {
          error: 'API configuration error',
          message: 'xAI API key is not configured',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function buildStoriesPrompt(designDoc: string, projectName: string): string {
  return `Based on the following project design document for "${projectName}", generate 5-10 user stories.

Design Document:
${designDoc}

Generate stories in the following JSON format (return ONLY valid JSON array, no other text):
[
  {
    "title": "User Story Title",
    "description": "As a [user type], I want to [action], so that [benefit]",
    "acceptanceCriteria": [
      "Given [context], when [action], then [expected result]",
      "Additional criteria..."
    ]
  }
]

Requirements for stories:
- Each story should be specific and actionable
- Acceptance criteria should be testable and clear
- Stories should cover key features from the design document
- Include both user-facing and technical stories
- Prioritize stories based on the phased approach mentioned in the design doc`;
}

