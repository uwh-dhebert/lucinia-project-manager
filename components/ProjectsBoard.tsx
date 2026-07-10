'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { ShareProjectModal } from '@/components/ShareProjectModal';
import { UserSelect } from '@/components/UserSelect';
import { getUserDisplayName, type AppUser } from '@/lib/users';
import {
  PRIORITY_ZONES,
  ZONE_BADGE_COLORS,
  ZONE_COLORS,
  ZONE_LABELS,
  flattenZones,
  groupByZone,
  sortProjectsForPriorities,
  type PriorityZone,
  type ProjectPriorityItem,
  type ProjectRow,
} from '@/lib/project-priorities';

function ZoneDivider({ label, color }: { label: string; color: string }) {
  return (
    <div className="relative py-6">
      <div className="absolute inset-0 flex items-center">
        <div className={`w-full border-t-2 ${color}`} />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-lucina-primary px-4 text-xs font-semibold uppercase tracking-wider text-lucina-muted">
          {label}
        </span>
      </div>
    </div>
  );
}

function resolveResponsibleUserId(responsible: string, users: AppUser[]): string {
  if (!responsible) return '';
  if (users.some((u) => u.id === responsible)) return responsible;
  const byName = users.find(
    (u) => getUserDisplayName(u).toLowerCase() === responsible.toLowerCase()
  );
  return byName?.id ?? '';
}

interface ProjectCardProps {
  item: ProjectPriorityItem;
  users: AppUser[];
  onResponsibleChange: (id: string, responsible: string) => void;
  onStatusChange: (id: string, zone: PriorityZone) => void;
  onShare?: (id: string, name: string) => void;
  isDragging?: boolean;
}

function ProjectCard({ item, users, onResponsibleChange, onStatusChange, onShare, isDragging }: ProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id, data: { zone: item.zone } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex h-full flex-col rounded-xl border border-lucina-rose bg-lucina-white p-4 shadow-sm transition-shadow hover:border-lucina-secondary hover:shadow-md ${
        isDragging ? 'shadow-xl ring-2 ring-lucina-secondary/50' : ''
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/projects/${item.slug}`}
            className="font-semibold text-lucina-primary hover:text-lucina-secondary transition-colors line-clamp-2"
          >
            {item.name}
          </Link>
          {item.isShared && (
            <span className="mt-1 inline-block text-xs font-medium text-lucina-secondary bg-lucina-surface px-2 py-0.5 rounded-full">
              Shared with you
            </span>
          )}
        </div>
        <button
          type="button"
          className="shrink-0 cursor-grab touch-none rounded-lg p-1.5 text-lucina-muted hover:bg-lucina-surface hover:text-lucina-secondary active:cursor-grabbing"
          aria-label={`Drag ${item.name}`}
          {...attributes}
          {...listeners}
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </button>
      </div>

      {item.description && (
        <p className="text-lucina-muted text-sm line-clamp-2 mb-3">{item.description}</p>
      )}

      <div className="mt-auto space-y-2">
        <div>
          <label className="block text-xs font-medium text-lucina-muted mb-1">Status</label>
          <select
            value={item.zone}
            onChange={(e) => onStatusChange(item.id, e.target.value as PriorityZone)}
            className={`w-full rounded-lg border px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-lucina-secondary ${ZONE_BADGE_COLORS[item.zone]}`}
          >
            {PRIORITY_ZONES.map((zone) => (
              <option key={zone} value={zone} className="bg-lucina-white text-lucina-primary">
                {ZONE_LABELS[zone]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-lucina-muted mb-1">Responsible</label>
          <UserSelect
            users={users}
            value={resolveResponsibleUserId(item.responsible, users)}
            onChange={(userId) => onResponsibleChange(item.id, userId)}
            allowUnassigned
            className="w-full rounded-lg border border-lucina-rose bg-lucina-surface px-2.5 py-1.5 text-sm text-lucina-primary focus:outline-none focus:ring-2 focus:ring-lucina-secondary"
            disabled={isDragging}
          />
        </div>

        {item.isOwner !== false && onShare && (
          <button
            type="button"
            onClick={() => onShare(item.id, item.name)}
            className="w-full text-xs font-medium text-lucina-secondary hover:text-lucina-primary py-1.5 rounded-lg hover:bg-lucina-surface transition-colors"
          >
            Share with team
          </button>
        )}
      </div>
    </div>
  );
}

function ZoneSection({
  zone,
  items,
  users,
  onResponsibleChange,
  onStatusChange,
  onShare,
  showTopDivider,
  dividerLabel,
  dividerColor,
}: {
  zone: PriorityZone;
  items: ProjectPriorityItem[];
  users: AppUser[];
  onResponsibleChange: (id: string, responsible: string) => void;
  onStatusChange: (id: string, zone: PriorityZone) => void;
  onShare?: (id: string, name: string) => void;
  showTopDivider?: boolean;
  dividerLabel?: string;
  dividerColor?: string;
}) {
  const ids = items.map((item) => item.id);
  const { setNodeRef, isOver } = useDroppable({ id: zone });

  return (
    <div data-zone={zone}>
      {showTopDivider && dividerLabel && dividerColor && (
        <ZoneDivider label={dividerLabel} color={dividerColor} />
      )}

      <div
        ref={setNodeRef}
        className={`rounded-2xl border p-4 min-h-[80px] transition-colors ${ZONE_COLORS[zone]} ${
          isOver ? 'ring-2 ring-lucina-secondary/40' : ''
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-lucina-secondary">
            {ZONE_LABELS[zone]}
          </h3>
          <span className="rounded-full bg-lucina-white px-2.5 py-0.5 text-xs text-lucina-muted">
            {items.length}
          </span>
        </div>

        <SortableContext items={ids} strategy={rectSortingStrategy}>
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-lucina-muted">Drop projects here</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <ProjectCard
                  key={item.id}
                  item={item}
                  users={users}
                  onResponsibleChange={onResponsibleChange}
                  onStatusChange={onStatusChange}
                  onShare={onShare}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export function ProjectsBoard() {
  const [items, setItems] = useState<ProjectPriorityItem[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [shareModal, setShareModal] = useState<{ id: string; name: string } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dbError, setDbError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const grouped = useMemo(() => groupByZone(items), [items]);
  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  const loadProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        const data = await response.json();
        if (response.status === 503) {
          setDbError(data.message || 'Database not initialized');
        }
        return;
      }
      const data = (await response.json()) as ProjectRow[];
      setItems(sortProjectsForPriorities(data));
      setDbError('');
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users?includeSelf=true');
      if (response.ok) {
        setUsers((await response.json()) as AppUser[]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, [loadProjects, loadUsers]);

  const persistOrder = async (nextGrouped: Record<PriorityZone, ProjectPriorityItem[]>) => {
    const flattened = flattenZones(nextGrouped);
    setItems(flattened);
    setSaving(true);

    try {
      const response = await fetch('/api/projects/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: flattened.map((item) => ({
            id: item.id,
            zone: item.zone,
            sortOrder: item.sortOrder,
          })),
        }),
      });

      if (!response.ok) {
        await loadProjects();
      }
    } catch {
      await loadProjects();
    } finally {
      setSaving(false);
    }
  };

  const findZoneForId = (id: string, state: Record<PriorityZone, ProjectPriorityItem[]>) => {
    for (const zone of PRIORITY_ZONES) {
      if (state[zone].some((item) => item.id === id)) {
        return zone;
      }
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeItemId = String(active.id);
    const overId = String(over.id);

    setItems((current) => {
      const state = groupByZone(current);
      const activeZone = findZoneForId(activeItemId, state);
      if (!activeZone) return current;

      let overZone: PriorityZone | null = null;
      if (PRIORITY_ZONES.includes(overId as PriorityZone)) {
        overZone = overId as PriorityZone;
      } else {
        overZone = findZoneForId(overId, state);
      }

      if (!overZone || activeZone === overZone) return current;

      const activeIndex = state[activeZone].findIndex((item) => item.id === activeItemId);
      const overIndex = PRIORITY_ZONES.includes(overId as PriorityZone)
        ? state[overZone].length
        : state[overZone].findIndex((item) => item.id === overId);

      if (activeIndex === -1) return current;

      const movingItem = state[activeZone][activeIndex];
      const nextActive = state[activeZone].filter((item) => item.id !== activeItemId);
      const nextOver = [...state[overZone]];
      const insertAt = overIndex >= 0 ? overIndex : nextOver.length;
      nextOver.splice(insertAt, 0, { ...movingItem, zone: overZone });

      return flattenZones({
        ...state,
        [activeZone]: nextActive,
        [overZone]: nextOver,
      });
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeItemId = String(active.id);
    const overId = String(over.id);
    const state = groupByZone(items);
    const activeZone = findZoneForId(activeItemId, state);
    if (!activeZone) return;

    let overZone: PriorityZone | null = null;
    if (PRIORITY_ZONES.includes(overId as PriorityZone)) {
      overZone = overId as PriorityZone;
    } else {
      overZone = findZoneForId(overId, state);
    }

    if (!overZone) return;

    if (activeZone === overZone && activeItemId !== overId) {
      const oldIndex = state[activeZone].findIndex((item) => item.id === activeItemId);
      const newIndex = state[activeZone].findIndex((item) => item.id === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(state[activeZone], oldIndex, newIndex);
        persistOrder({ ...state, [activeZone]: reordered });
        return;
      }
    }

    persistOrder(state);
  };

  const patchProject = async (id: string, updates: Record<string, string>) => {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return response.ok ? response.json() : null;
  };

  const handleResponsibleChange = async (id: string, responsible: string) => {
    const current = items.find((item) => item.id === id);
    if (!current || current.responsible === responsible) return;

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, responsible } : item))
    );

    try {
      await patchProject(id, { responsible });
    } catch (error) {
      console.error('Failed to update responsible:', error);
      loadProjects();
    }
  };

  const handleStatusChange = async (id: string, zone: PriorityZone) => {
    const current = items.find((item) => item.id === id);
    if (!current || current.zone === zone) return;

    const state = groupByZone(items);
    const fromZone = current.zone;
    const moving = state[fromZone].find((item) => item.id === id);
    if (!moving) return;

    const nextFrom = state[fromZone].filter((item) => item.id !== id);
    const nextTo = [...state[zone], { ...moving, zone }];
    const nextGrouped = { ...state, [fromZone]: nextFrom, [zone]: nextTo };

    persistOrder(nextGrouped);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lucina-secondary" />
        <p className="text-lucina-muted mt-2">Loading projects...</p>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="rounded-2xl border border-amber-700/50 bg-amber-950/20 p-8 text-center">
        <p className="text-amber-300 font-medium">{dbError}</p>
        <p className="text-lucina-muted text-sm mt-2">
          Run PROJECT_PRIORITIES.sql in the Supabase SQL Editor to add priority columns to projects.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-lucina-primary">Projects</h1>
          <p className="text-lucina-muted mt-2">
            Drag projects between zones, mark them completed, and share with your team.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-lucina-muted">Saving...</span>}
          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-2.5 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors shadow-lg hover:shadow-xl"
          >
            + New Project
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-lucina-rose rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-lucina-muted mb-6 text-lg">No projects yet. Create your first project to get started.</p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-8 py-3 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors shadow-lg hover:shadow-xl"
          >
            Create Your First Project
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-2">
            <ZoneSection
              zone="active"
              items={grouped.active}
              users={users}
              onResponsibleChange={handleResponsibleChange}
              onStatusChange={handleStatusChange}
              onShare={(id, name) => setShareModal({ id, name })}
            />

            <ZoneSection
              zone="prioritized"
              items={grouped.prioritized}
              users={users}
              onResponsibleChange={handleResponsibleChange}
              onStatusChange={handleStatusChange}
              onShare={(id, name) => setShareModal({ id, name })}
              showTopDivider
              dividerLabel="Active → Prioritized"
              dividerColor="border-emerald-500/40"
            />

            <ZoneSection
              zone="in_design"
              items={grouped.in_design}
              users={users}
              onResponsibleChange={handleResponsibleChange}
              onStatusChange={handleStatusChange}
              onShare={(id, name) => setShareModal({ id, name })}
              showTopDivider
              dividerLabel="Prioritized → In Design"
              dividerColor="border-amber-500/40"
            />

            <ZoneSection
              zone="completed"
              items={grouped.completed}
              users={users}
              onResponsibleChange={handleResponsibleChange}
              onStatusChange={handleStatusChange}
              onShare={(id, name) => setShareModal({ id, name })}
              showTopDivider
              dividerLabel="In Design → Completed"
              dividerColor="border-lucina-secondary/40"
            />
          </div>

          <DragOverlay>
            {activeItem ? (
              <ProjectCard
                item={activeItem}
                users={users}
                onResponsibleChange={() => {}}
                onStatusChange={() => {}}
                isDragging
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <CreateProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadProjects}
      />

      {shareModal && (
        <ShareProjectModal
          isOpen={!!shareModal}
          projectId={shareModal.id}
          projectName={shareModal.name}
          onClose={() => setShareModal(null)}
        />
      )}
    </div>
  );
}