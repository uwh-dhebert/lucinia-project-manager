export type PriorityZone = 'in_design' | 'prioritized' | 'active' | 'qa' | 'completed';

export interface ProjectPriorityItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  responsible: string;
  zone: PriorityZone;
  sortOrder: number;
  ownerId: string;
  isOwner?: boolean;
  isShared?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PRIORITY_ZONES: PriorityZone[] = ['in_design', 'prioritized', 'active', 'qa', 'completed'];

export const ZONE_LABELS: Record<PriorityZone, string> = {
  in_design: 'Design',
  prioritized: 'Prioritize',
  active: 'Active',
  qa: 'QA',
  completed: 'Complete',
};

export const ZONE_COLORS: Record<PriorityZone, string> = {
  in_design: 'border-lucina-secondary/50 bg-lucina-surface',
  prioritized: 'border-amber-500/50 bg-amber-50',
  active: 'border-emerald-500/50 bg-emerald-50',
  qa: 'border-sky-500/50 bg-sky-50',
  completed: 'border-lucina-muted/50 bg-lucina-accent',
};

export const ZONE_BADGE_COLORS: Record<PriorityZone, string> = {
  in_design: 'bg-lucina-surface text-lucina-secondary border-lucina-rose/50',
  prioritized: 'bg-amber-50 text-amber-700 border-amber-300/50',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-300/50',
  qa: 'bg-sky-50 text-sky-700 border-sky-300/50',
  completed: 'bg-lucina-accent text-lucina-muted border-lucina-muted/50',
};

export function normalizePriorityZone(value: string | null | undefined): PriorityZone {
  return PRIORITY_ZONES.includes(value as PriorityZone) ? (value as PriorityZone) : 'in_design';
}

export interface ProjectRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  responsible?: string | null;
  priorityZone?: string | null;
  priorityOrder?: number | null;
  isOwner?: boolean;
  isShared?: boolean;
  createdAt: string;
  updatedAt: string;
}

export function mapProjectToPriorityItem(project: ProjectRow): ProjectPriorityItem {
  const zone = PRIORITY_ZONES.includes(project.priorityZone as PriorityZone)
    ? (project.priorityZone as PriorityZone)
    : 'in_design';

  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description ?? '',
    responsible: project.responsible ?? '',
    zone,
    sortOrder: project.priorityOrder ?? 0,
    ownerId: project.ownerId,
    isOwner: project.isOwner,
    isShared: project.isShared,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export function groupByZone(items: ProjectPriorityItem[]): Record<PriorityZone, ProjectPriorityItem[]> {
  const grouped: Record<PriorityZone, ProjectPriorityItem[]> = {
    in_design: [],
    prioritized: [],
    active: [],
    qa: [],
    completed: [],
  };

  for (const item of items) {
    if (grouped[item.zone]) {
      grouped[item.zone].push(item);
    }
  }

  for (const zone of PRIORITY_ZONES) {
    grouped[zone].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  return grouped;
}

export function flattenZones(grouped: Record<PriorityZone, ProjectPriorityItem[]>): ProjectPriorityItem[] {
  return PRIORITY_ZONES.flatMap((zone) =>
    grouped[zone].map((item, index) => ({ ...item, zone, sortOrder: index }))
  );
}

export const COMPLETED_WINDOW_DAYS = 7;

/**
 * A completed project counts as "recent" when it was last touched within the
 * window. `updatedAt` is the best available proxy for when it moved to Complete.
 */
export function isRecentlyCompleted(
  item: ProjectPriorityItem,
  now: number = Date.now(),
  windowDays: number = COMPLETED_WINDOW_DAYS
): boolean {
  const updated = new Date(item.updatedAt).getTime();
  if (Number.isNaN(updated)) return true;
  return now - updated <= windowDays * 24 * 60 * 60 * 1000;
}

export function sortProjectsForPriorities(projects: ProjectRow[]): ProjectPriorityItem[] {
  const items = projects.map(mapProjectToPriorityItem);
  const grouped = groupByZone(items);
  return PRIORITY_ZONES.flatMap((zone) => grouped[zone]);
}