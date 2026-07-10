/**
 * Generate Project Design Document API
 * Uses Grok's reasoning model to create comprehensive design documents
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessProject } from '@/lib/project-access';

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

    // Fetch project details
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

    // Prepare the prompt for Grok's reasoning model
    const prompt = buildDesignDocumentPrompt(project);

    // Call Grok with the full reasoning model (not lite)
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
            content: `You are an expert technical writer and project manager. Generate a comprehensive Project Design Document in Markdown format using the template provided. Be thorough, professional, and logical.`,
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
    const document = data.choices?.[0]?.message?.content || '';

    return NextResponse.json(
      {
        success: true,
        document,
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Design document generation error:', error);

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

function buildDesignDocumentPrompt(project: any): string {
  return `Generate a comprehensive Project Design Document for the following project:

Project Name: ${project.name}
Project Description: ${project.description || 'Not provided'}
Project ID: ${project.id}

Use this template structure:

# ${project.name} - Project Design Document

## Overview

## Problem Statement
Based on the project description, identify the core problem this project solves.

## Project Objectives

### In Scope
- List key features and deliverables

### Out of Scope
- Define what is intentionally excluded

### Guiding Principles
- Cutover Strategy
- Composable by Design
- Enterprise Alignment
- Standards-Driven
- Testability

## Target Architecture (High-Level)
Describe the proposed technical approach and major components.

## Phased Approach (Proposed)

### Phase 1: Architecture & Design
Define architecture, design documents, and setup.

### Phase 2: Build
Implementation of core features.

### Phase 3: Validation & Cutover
Testing, validation, and deployment preparation.

### Phase 4: Enterprise Enablement
Training, documentation, and operational handoff.

## Success Criteria
- Define measurable success metrics
- Performance benchmarks
- User adoption targets

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| [Risk 1] | [High/Medium/Low] | [High/Medium/Low] | [Mitigation Strategy] |

## Dependencies
- List internal and external dependencies

## Governance, Staffing & Timeline

### Team
- Project Lead
- Technical Lead
- Development Team
- QA Team

### Timeline
- Estimated durations for each phase
- Key milestones
- Delivery dates

## Next Steps
- Immediate action items
- Decision required
- Approval gates

---

Make the document detailed, professional, and realistic based on the project information provided. Use proper Markdown formatting with headers, bullet points, and tables where appropriate. Generate approximately 2000-3000 words.`;
}

