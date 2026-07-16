import { extractCab } from './cab';
import { extractText, isOneFile } from './onenote-text';
import { parseSectionPages } from './onestore';

// Turns a .onepkg (an exported OneNote notebook) into the wiki's shape.
//
// Structure mapping:
//   section group (folder)      -> one wiki topic ("Group / Subgroup" when nested)
//   sections at notebook root   -> a topic named after the notebook
//   section (.one file)         -> one subject, in original notebook order
//   page                        -> one content item (page title -> item title,
//                                  page text -> item content)
//
// Page segmentation uses the [MS-ONESTORE] parser; if a section cannot be
// parsed structurally it falls back to flat text extraction as a single item.

export interface ParsedPage {
  title: string | null;
  text: string;
}

export interface ParsedSection {
  /** Section-group chain, outermost first. Empty for top-level sections. */
  groupPath: string[];
  /** Section name without the .one extension. */
  name: string;
  pages: ParsedPage[];
  /** True when no text could be recovered (often a password-protected section). */
  empty: boolean;
  /** True when the section fell back to unstructured text extraction. */
  flat: boolean;
}

export interface ParsedTopic {
  title: string;
  sections: ParsedSection[];
}

export interface ParsedNotebook {
  name: string;
  topics: ParsedTopic[];
  sectionCount: number;
  pageCount: number;
  /** Non-section files we intentionally ignored (tocs, images, etc.) */
  skippedFiles: string[];
}

export function parseOnepkg(buffer: Uint8Array, fileName: string): ParsedNotebook {
  const entries = extractCab(buffer);
  const notebookName = fileName.replace(/\.onepkg$/i, '').trim() || 'Imported notebook';

  const sections: ParsedSection[] = [];
  const skippedFiles: string[] = [];

  for (const entry of entries) {
    const segments = entry.path.split('/').filter(Boolean);
    const base = segments[segments.length - 1] ?? '';

    if (!base.toLowerCase().endsWith('.one')) {
      skippedFiles.push(entry.path);
      continue;
    }

    const groupPath = segments.slice(0, -1);
    const name = base.replace(/\.one$/i, '');

    const structured = parseSectionPages(entry.data);
    let pages: ParsedPage[];
    let flat = false;

    if (structured) {
      pages = structured.map((page) => ({
        title: page.title,
        text: page.paragraphs.join('\n\n'),
      }));
    } else {
      // Fallback: unstructured text scrape, one item for the whole section.
      flat = true;
      const paragraphs = isOneFile(entry.data) ? extractText(entry.data) : [];
      const text = paragraphs.join('\n\n');
      pages = text ? [{ title: null, text }] : [];
    }

    sections.push({
      groupPath,
      name,
      pages,
      empty: pages.length === 0,
      flat,
    });
  }

  if (sections.length === 0) {
    throw new Error('No OneNote sections found in this .onepkg file.');
  }

  // Group sections into topics: one topic per section group (nested groups
  // flatten to "Group / Subgroup"), root sections under the notebook's name.
  const topicsByKey = new Map<string, ParsedTopic>();
  for (const section of sections) {
    const title = section.groupPath.length > 0 ? section.groupPath.join(' / ') : notebookName;
    let topic = topicsByKey.get(title);
    if (!topic) {
      topic = { title, sections: [] };
      topicsByKey.set(title, topic);
    }
    topic.sections.push(section);
  }

  return {
    name: notebookName,
    topics: [...topicsByKey.values()],
    sectionCount: sections.length,
    pageCount: sections.reduce((n, s) => n + s.pages.length, 0),
    skippedFiles,
  };
}
