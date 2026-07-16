import { extractCab } from './cab';
import { extractText, isOneFile } from './onenote-text';

// Turns a .onepkg (an exported OneNote notebook) into the wiki's shape.
//
// Structure mapping — the cabinet's internal paths ARE the notebook's folder
// structure, so it maps over exactly:
//   notebook (.onepkg)          -> one wiki topic
//   section group folders       -> subject title prefix ("Group / Section")
//   section (.one file)         -> one subject, in original notebook order
//   extracted page text         -> one content item per section

export interface ParsedSection {
  /** Section-group chain, outermost first. Empty for top-level sections. */
  groupPath: string[];
  /** Section name without the .one extension. */
  name: string;
  /** "Group / Subgroup / Section" — what the wiki subject will be titled. */
  title: string;
  /** Extracted text paragraphs joined with blank lines. */
  text: string;
  /** True when no text could be recovered (often a password-protected section). */
  empty: boolean;
}

export interface ParsedNotebook {
  name: string;
  sections: ParsedSection[];
  /** Non-section files we intentionally ignored (tocs, images, etc.) */
  skippedFiles: string[];
}

export function parseOnepkg(buffer: Uint8Array, fileName: string): ParsedNotebook {
  const entries = extractCab(buffer);

  const sections: ParsedSection[] = [];
  const skippedFiles: string[] = [];

  for (const entry of entries) {
    const segments = entry.path.split('/').filter(Boolean);
    const base = segments[segments.length - 1] ?? '';

    if (!base.toLowerCase().endsWith('.one')) {
      // .onetoc2 files carry ordering metadata we already get from entry
      // order; anything else (embedded files) has no wiki equivalent.
      skippedFiles.push(entry.path);
      continue;
    }

    const groupPath = segments.slice(0, -1);
    const name = base.replace(/\.one$/i, '');
    const paragraphs = isOneFile(entry.data) ? extractText(entry.data) : [];
    const text = paragraphs.join('\n\n');

    sections.push({
      groupPath,
      name,
      title: [...groupPath, name].join(' / '),
      text,
      empty: text.length === 0,
    });
  }

  if (sections.length === 0) {
    throw new Error('No OneNote sections found in this .onepkg file.');
  }

  return {
    name: fileName.replace(/\.onepkg$/i, '').trim() || 'Imported notebook',
    sections,
    skippedFiles,
  };
}
