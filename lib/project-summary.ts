import type { SupabaseClient } from '@supabase/supabase-js';
import { getDesignDocBody } from '@/lib/design-doc';

export interface ProjectSummaryContext {
  projectName: string;
  projectDescription: string;
  notes: string[];
  designDoc: string;
  stories: Array<{
    title: string;
    description: string;
    acceptanceCriteria: string[];
  }>;
}

export async function gatherProjectSummaryContext(
  supabase: SupabaseClient,
  projectId: string,
  project: { name: string; description?: string | null }
): Promise<ProjectSummaryContext> {
  const [{ data: notes }, { data: designDoc }, { data: stories }] = await Promise.all([
    supabase
      .from('project_notes')
      .select('content')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase
      .from('project_design_docs')
      .select('content')
      .eq('project_id', projectId)
      .maybeSingle(),
    supabase
      .from('project_stories')
      .select('title, description, acceptance_criteria')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true }),
  ]);

  return {
    projectName: project.name,
    projectDescription: project.description?.trim() ?? '',
    notes: (notes ?? []).map((note) => String(note.content ?? '').trim()).filter(Boolean),
    designDoc: designDoc?.content ? getDesignDocBody(designDoc.content) : '',
    stories: (stories ?? []).map((story) => ({
      title: String(story.title ?? ''),
      description: String(story.description ?? ''),
      acceptanceCriteria: Array.isArray(story.acceptance_criteria)
        ? story.acceptance_criteria.map(String)
        : [],
    })),
  };
}

export function buildProjectSummaryPrompt(context: ProjectSummaryContext): string {
  const notesSection =
    context.notes.length > 0
      ? context.notes.map((note, index) => `### Note ${index + 1}\n${note}`).join('\n\n')
      : '_No notes yet._';

  const designDocSection = context.designDoc.trim()
    ? context.designDoc.trim()
    : '_No design document yet._';

  const storiesSection =
    context.stories.length > 0
      ? context.stories
          .map((story, index) => {
            const criteria =
              story.acceptanceCriteria.length > 0
                ? story.acceptanceCriteria.map((item) => `- ${item}`).join('\n')
                : '_No acceptance criteria listed._';
            return `### Story ${index + 1}: ${story.title}\n${story.description}\n\n**Acceptance criteria**\n${criteria}`;
          })
          .join('\n\n')
      : '_No stories yet._';

  return `Create a concise project summary for "${context.projectName}" in Markdown.

Use the project notes, design document, and user stories below. Synthesize them into one readable overview for stakeholders.

Project description:
${context.projectDescription || '_No project description provided._'}

## Source material

### Notes
${notesSection}

### Design document
${designDocSection}

### Stories
${storiesSection}

## Output requirements
- Return Markdown only (no code fences wrapping the whole response).
- Start with a single H1 title: "# ${context.projectName} — Project Summary"
- Include these sections with H2 headings:
  - Overview
  - Key themes from notes
  - Design direction
  - Story highlights
  - Current status & recommended next steps
- Be factual and grounded in the provided material.
- If a source section is empty, say so briefly instead of inventing details.
- Keep the full summary under about 600 words.`;
}

export function formatSummaryUpdatedAt(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}