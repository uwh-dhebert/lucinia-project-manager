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