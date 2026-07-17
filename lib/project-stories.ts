export type StorySource = 'generated' | 'manual';

export interface StoryRecord {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  source: StorySource;
  createdAt?: string;
  updatedAt?: string;
}

export function normalizeStorySource(value: unknown): StorySource {
  return value === 'manual' ? 'manual' : 'generated';
}

export function mapStoryRow(row: Record<string, unknown>): StoryRecord {
  const rawCriteria = row.acceptance_criteria ?? row.acceptanceCriteria;

  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    acceptanceCriteria: Array.isArray(rawCriteria) ? rawCriteria.map(String) : [],
    source: normalizeStorySource(row.source),
    createdAt: row.created_at ? String(row.created_at) : row.createdAt ? String(row.createdAt) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : row.updatedAt ? String(row.updatedAt) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Generation: design document is the source of truth for AI stories
// ---------------------------------------------------------------------------

/** System role: architect + engineer + product owner with chunked delivery bias. */
export const STORIES_SYSTEM_PROMPT = `You are an expert software architect, software engineer, and product owner.

Your job is to turn a project design document into a minimal set of delivery-ready user stories.

Sizing and grouping rules (mandatory):
- Target roughly 2–3 days of focused engineering work per story for related ("like") work.
- Minimize the total number of stories. Prefer fewer, larger, cohesive stories over many tiny ones.
- Only create a separate story when the work is distinctly different (different capability, stakeholder outcome, system boundary, or phase dependency that cannot sensibly ship together).
- Do NOT split by technical layer alone (e.g. separate "DB", "API", "UI" stories for the same feature) when those pieces form one vertical slice of the same capability.
- Do NOT invent micro-stories for chores, pure tech debt, or one-line config unless the design document elevates them as standalone deliverables.
- When the design doc has phases, map stories to phase outcomes, not every bullet under a phase.

Quality bar:
- Each story must be independently valuable or a clear, shippable building block.
- Descriptions use "As a… I want… so that…" when a user/persona is clear; for platform/infrastructure work, state the capability and business/operational outcome plainly.
- Acceptance criteria are testable (Given/When/Then or equivalent checklists) and cover happy path plus critical failure/edge cases for that slice.
- Cover the design document's in-scope outcomes; do not invent out-of-scope work.
- Order stories in a sensible delivery sequence (dependencies and phased approach).

Return only a JSON array in the format requested by the user message—no prose outside the JSON.`;

export function buildStoriesPrompt(designDoc: string, projectName: string): string {
  return `Based on the following project design document for "${projectName}", generate user stories for delivery.

## Story count and size (product-owner rules)
- Minimize story count.
- Each story should represent about **2–3 days** of work for related items that ship as one capability.
- Create a **separate story only** when work is **distinctly different** (different outcome, system boundary, or hard dependency that should not be combined).
- Prefer vertical slices of a capability over horizontal technical slices.
- Typical output: as few stories as needed to cover in-scope work—often fewer than 8; never pad to hit a number. Skip a fixed 5–10 quota.

## Design Document
${designDoc}

## Output format
Return ONLY a valid JSON array (no markdown fences, no commentary):
[
  {
    "title": "Concise capability-oriented title",
    "description": "As a [user type], I want to [action], so that [benefit] — or a clear capability statement for platform work",
    "acceptanceCriteria": [
      "Given [context], when [action], then [expected result]",
      "Additional testable criteria covering the full 2–3 day slice"
    ]
  }
]

## Requirements
- Specific, actionable, and implementable from the design document alone
- Acceptance criteria thorough enough for the full slice (not a single checkbox story)
- Include user-facing and technical/platform work when the design requires both—but merge related work into the same story when it is one deliverable
- Respect phased approach and dependencies from the design document when ordering the array`;
}
