'use client';

import { useEffect, useRef, useState } from 'react';
import { UserSelect } from '@/components/UserSelect';
import { getUserDisplayName, type AppUser } from '@/lib/users';

interface ProjectMember {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
}

interface ShareProjectModalProps {
  isOpen: boolean;
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export function ShareProjectModal({
  isOpen,
  projectId,
  projectName,
  onClose,
}: ShareProjectModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      loadData();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, projectId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const fetchMembers = () => fetch(`/api/projects/${projectId}/members`);

      let membersRes = await fetchMembers();
      let membersData: { members?: ProjectMember[]; tableMissing?: boolean; error?: string } =
        membersRes.ok
          ? await membersRes.json()
          : await membersRes.json().catch(() => ({ error: 'Failed to load members' }));

      if (membersRes.ok && membersData.tableMissing) {
        const setupRes = await fetch('/api/setup-sharing', { method: 'POST' });
        if (setupRes.ok) {
          membersRes = await fetchMembers();
          membersData = membersRes.ok
            ? await membersRes.json()
            : await membersRes.json().catch(() => ({ error: 'Failed to load members' }));
        }
      }

      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      } else {
        const usersData = await usersRes.json().catch(() => ({}));
        setError(usersData.error || 'Failed to load users');
      }

      if (membersRes.ok) {
        setMembers(membersData.members ?? []);
        if (membersData.tableMissing) {
          setError('Sharing setup is still initializing. Wait a few seconds and reopen this dialog.');
        }
      } else {
        setError(membersData.error || 'Failed to load members');
      }
    } catch (err) {
      console.error('Failed to load sharing data:', err);
      setError('Failed to load sharing data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to share project');
      }

      const member = await response.json();
      setMembers((prev) => [...prev, member]);
      setSelectedUserId('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to share project');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const memberIds = new Set(members.map((m) => m.userId));
  const availableUsers = users.filter((u) => !memberIds.has(u.id));

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/70 rounded-2xl shadow-2xl max-w-lg w-full p-6 bg-lucina-white border border-lucina-rose"
      onClose={onClose}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-lucina-primary">Share Project</h2>
          <p className="text-lucina-muted text-sm mt-1">
            Give other users access to <span className="font-medium text-lucina-secondary">{projectName}</span>
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <UserSelect
            users={availableUsers}
            value={selectedUserId}
            onChange={setSelectedUserId}
            placeholder="Select a user..."
            className="flex-1 px-3 py-2 border border-lucina-rose rounded-xl bg-lucina-surface text-lucina-primary focus:outline-none focus:ring-2 focus:ring-lucina-secondary"
            disabled={loading || availableUsers.length === 0}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedUserId || loading}
            className="px-4 py-2 btn-lucina text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-lucina-primary mb-2 uppercase tracking-wide">
            Shared with ({members.length})
          </h3>
          {members.length === 0 ? (
            <p className="text-sm text-lucina-muted py-4 text-center border border-dashed border-lucina-rose rounded-xl">
              Not shared with anyone yet
            </p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-lucina-surface border border-lucina-rose"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-lucina-primary truncate">
                      {getUserDisplayName(member)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(member.userId)}
                    disabled={loading}
                    className="text-xs text-red-600 hover:text-red-700 font-medium shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full px-4 py-2.5 border border-lucina-rose text-lucina-secondary font-medium rounded-full hover:bg-lucina-surface transition-colors"
        >
          Done
        </button>
      </div>
    </dialog>
  );
}