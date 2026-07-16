const VERSION_PATTERN = /document\s+version:\s*([\d]+(?:\.[\d]+)?)/i;
const PLACEHOLDER_DATE = /\[current date\]/i;

export function formatDesignDocDate(value?: string | Date | null): string | null {
  if (!value) return null;

  if (typeof value === 'string' && PLACEHOLDER_DATE.test(value.trim())) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function parseDesignDocVersion(content: string): string {
  const match = content.match(VERSION_PATTERN);
  return match?.[1] ?? '1.0';
}

export function nextDesignDocVersion(content: string): string {
  const current = parseDesignDocVersion(content);
  const [major, minor = '0'] = current.split('.');
  const majorNum = Number(major);
  const minorNum = Number(minor);

  if (Number.isNaN(majorNum) || Number.isNaN(minorNum)) {
    return '1.0';
  }

  return `${majorNum}.${minorNum + 1}`;
}

export function stripDesignDocMetadata(content: string): string {
  return content
    .replace(/^#\s+.+\n+/m, '')
    .replace(/\*\*Document Version:\*\*\s*[\d.]+\s*\n?/gi, '')
    .replace(/\*\*Last Updated:\*\*\s*.+\s*\n?/gi, '')
    .replace(/\*\*Status:\*\*\s*.+\s*\n?/gi, '')
    .replace(/^Document Version:\s*[\d.]+\s*\n?/gim, '')
    .replace(/^Last Updated:\s*(\[Current Date\]|[\d/,: A-Za-z]+)\s*\n?/gim, '')
    .replace(/^Status:\s*.+\s*\n?/gim, '')
    .replace(/^\s*---\s*\n/gm, '')
    .trim();
}

export function buildDesignDocMetadata(options: {
  projectName: string;
  version: string;
  updatedAt?: string | Date;
  status?: string;
}): string {
  const updated =
    formatDesignDocDate(options.updatedAt ?? new Date()) ??
    formatDesignDocDate(new Date())!;

  return [
    `# ${options.projectName} - Project Design Document`,
    '',
    `**Document Version:** ${options.version}`,
    `**Last Updated:** ${updated}`,
    `**Status:** ${options.status ?? 'Draft'}`,
    '',
    '---',
    '',
  ].join('\n');
}

export function withDesignDocMetadata(
  content: string,
  options: {
    projectName: string;
    version: string;
    updatedAt?: string | Date;
    status?: string;
  }
): string {
  const body = stripDesignDocMetadata(content);
  return `${buildDesignDocMetadata(options)}${body}`;
}

export function getDesignDocBody(content: string): string {
  return stripDesignDocMetadata(content);
}

// ---------------------------------------------------------------------------
// Generation: project notes + description are the source of truth for the AI
// ---------------------------------------------------------------------------

export interface DesignDocNote {
  content: string;
  createdAt?: string;
}

export interface DesignDocGenerationContext {
  projectName: string;
  projectDescription: string;
  projectId: string;
  version: string;
  notes: DesignDocNote[];
  /** Prior design-doc body (if regenerating). Used as a draft to improve, not override notes. */
  previousDesignDoc?: string;
}

export function formatNotesForPrompt(notes: DesignDocNote[]): string {
  if (notes.length === 0) {
    return '_No project notes provided._';
  }

  return notes
    .map((note, index) => {
      const stamp = note.createdAt
        ? ` _(added ${new Date(note.createdAt).toLocaleString()})_`
        : '';
      return `### Note ${index + 1}${stamp}\n${note.content.trim()}`;
    })
    .join('\n\n');
}

export function buildDesignDocumentPrompt(context: DesignDocGenerationContext): string {
  const notesSection = formatNotesForPrompt(context.notes);
  const previousSection = context.previousDesignDoc?.trim()
    ? context.previousDesignDoc.trim()
    : null;

  return `Generate a comprehensive Project Design Document for the following project.

## Project metadata
- **Project Name:** ${context.projectName}
- **Project Description:** ${context.projectDescription || 'Not provided'}
- **Project ID:** ${context.projectId}
- **Document Version:** ${context.version}

## Primary source material: project notes
The project notes below are the **authoritative requirements**. Treat them as instructions from the project owner.

You MUST incorporate their content into the design document — including:
- Data mapping / ETL requirements (e.g. Next Gen → Lucina Client)
- SQL column renames (\`SOURCE_COL as TargetCol\`)
- Explicit mapping tables when notes list source and target fields
- Open questions / TODOs called out in the notes
- Join logic, unpivots, defaults, and cast/transform rules when described

Do **not** invent generic filler that contradicts the notes. If notes specify mappings, produce clear Markdown tables such as:

| Next Gen (source) | Lucina Client (target) | Transform / notes |
|-------------------|------------------------|-------------------|
| V_PERSON.PERSON_ID | MemberId | direct |
| V_PERSON.FIRST_NAME | FirstName | direct |

When notes contain multiple target tables (e.g. client_member, client_memberaddress, client_claimline, ICD unpivot), give each its own subsection and mapping table.

### Notes
${notesSection}

${
  previousSection
    ? `## Previous design document (draft to improve)
Use this only as a starting structure. Prefer the **notes** when they conflict with this draft.

${previousSection}
`
    : ''
}
## Output rules
- Do NOT include a document title, version number, last updated date, or status header. Those are added separately. Start directly with \`## Overview\`.
- Return Markdown only (no wrapping code fence around the entire document).
- Be detailed and professional. Prefer concrete mappings from the notes over vague architecture fluff.
- Use proper Markdown: headers, bullet lists, and tables where appropriate.
- Preserve technical identifiers (view names, column names, SQL expressions) exactly as given in the notes unless you are documenting the rename.

## Required template structure
Adapt section bodies to the notes. Keep these headings (add subsections under Architecture for each mapped entity if needed):

## Overview

## Problem Statement
Ground this in the notes and project description.

## Project Objectives

### In Scope
- Features and deliverables from the notes (include data mappings and target tables)

### Out of Scope
- What is intentionally excluded (note TODOs / unknowns from the notes)

### Guiding Principles
- Cutover Strategy
- Composable by Design
- Enterprise Alignment
- Standards-Driven
- Testability

## Target Architecture (High-Level)
Describe components. Include a **Data mapping** section when notes describe source→target ETL.

### Data mapping (when applicable)
For each Lucina Client table (or target entity) described in the notes:
1. Short purpose
2. Source views / joins
3. Field mapping table: source column → target column (AS name) → transform
4. Any open questions / TODOs from the notes

## Phased Approach (Proposed)

### Phase 1: Architecture & Design

### Phase 2: Build

### Phase 3: Validation & Cutover

### Phase 4: Enterprise Enablement

## Success Criteria

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|

## Dependencies

## Governance, Staffing & Timeline

### Team

### Timeline

## Next Steps
`;
}

export const DESIGN_DOC_SYSTEM_PROMPT = `You are an expert technical writer for data platform and healthcare-adjacent ETL projects.
Generate a Project Design Document in Markdown from the project metadata and notes provided.
Project notes are authoritative: extract every mapping, SQL rename, join, transform, and open question they contain.
When notes describe source systems (e.g. Next Gen views) mapping into client tables, produce explicit Markdown mapping tables.
Do not ignore notes in favor of a generic template essay. Be thorough and precise with technical detail.`;
