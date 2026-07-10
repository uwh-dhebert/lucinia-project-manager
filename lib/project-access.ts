import type { SupabaseClient } from '@supabase/supabase-js';

export type ProjectAccessRole = 'owner' | 'member';

export async function getProjectAccess(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<ProjectAccessRole | null> {
  const { data: project } = await supabase
    .from('projects')
    .select('ownerId')
    .eq('id', projectId)
    .maybeSingle();

  if (!project) return null;
  if (project.ownerId === userId) return 'owner';

  const { data: membership, error } = await supabase
    .from('project_members')
    .select('id')
    .eq('projectId', projectId)
    .eq('userId', userId)
    .maybeSingle();

  if (error?.message?.includes('Could not find the table')) {
    return null;
  }

  return membership ? 'member' : null;
}

export async function canAccessProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<boolean> {
  const role = await getProjectAccess(supabase, userId, projectId);
  return role !== null;
}

export async function isProjectOwner(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<boolean> {
  return (await getProjectAccess(supabase, userId, projectId)) === 'owner';
}

export async function getSharedProjectIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data: memberships, error } = await supabase
    .from('project_members')
    .select('projectId')
    .eq('userId', userId);

  if (error?.message?.includes('Could not find the table')) {
    return [];
  }

  return (memberships ?? []).map((m) => m.projectId as string);
}

export async function getAccessibleProjects(
  supabase: SupabaseClient,
  userId: string
) {
  const sharedIds = await getSharedProjectIds(supabase, userId);

  const [ownedRes, sharedRes] = await Promise.all([
    supabase
      .from('projects')
      .select('*')
      .eq('ownerId', userId)
      .order('createdAt', { ascending: false }),
    sharedIds.length > 0
      ? supabase
          .from('projects')
          .select('*')
          .in('id', sharedIds)
          .order('createdAt', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (ownedRes.error) throw ownedRes.error;
  if (sharedRes.error) throw sharedRes.error;

  const owned = (ownedRes.data ?? []).map((p) => ({
    ...p,
    isOwner: true,
    isShared: false,
  }));

  const shared = (sharedRes.data ?? []).map((p) => ({
    ...p,
    isOwner: false,
    isShared: true,
  }));

  const seen = new Set<string>();
  return [...owned, ...shared].filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}