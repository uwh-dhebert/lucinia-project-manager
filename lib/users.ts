import { createAdminClient } from '@/utils/supabase/admin';

export interface AppUser {
  id: string;
  email: string;
  fullName: string | null;
}

export function getUserDisplayName(user: Pick<AppUser, 'fullName' | 'email'>): string {
  const name = user.fullName?.trim();
  return name || user.email;
}

export function getAuthUserDisplayName(
  metadata: Record<string, unknown> | undefined,
  email: string | undefined
): string {
  const fullName =
    (metadata?.full_name as string | undefined) ??
    (metadata?.name as string | undefined) ??
    null;
  return getUserDisplayName({ fullName, email: email ?? '' });
}

export function resolveResponsibleDisplayName(
  responsible: string,
  users: AppUser[]
): string {
  if (!responsible) return 'Unassigned';
  const byId = users.find((u) => u.id === responsible);
  if (byId) return getUserDisplayName(byId);
  const byName = users.find(
    (u) => getUserDisplayName(u).toLowerCase() === responsible.toLowerCase()
  );
  if (byName) return getUserDisplayName(byName);
  return responsible;
}

export async function listAppUsers(options?: {
  excludeUserId?: string;
}): Promise<AppUser[]> {
  const admin = createAdminClient();
  const users: AppUser[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(error.message);
    }

    for (const authUser of data.users) {
      if (!authUser.email) continue;
      if (options?.excludeUserId && authUser.id === options.excludeUserId) continue;
      users.push({
        id: authUser.id,
        email: authUser.email,
        fullName:
          (authUser.user_metadata?.full_name as string | undefined) ??
          (authUser.user_metadata?.name as string | undefined) ??
          null,
      });
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return users.sort((a, b) =>
    getUserDisplayName(a).localeCompare(getUserDisplayName(b))
  );
}