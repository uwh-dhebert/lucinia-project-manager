'use client';

import { useEffect, useState } from 'react';
import CreateLinkGroupModal from '@/components/CreateLinkGroupModal';
import CreateLinkModal from '@/components/CreateLinkModal';

interface LinkItem {
  id: string;
  title: string;
  url: string;
}

interface LinkGroup {
  id: string;
  name: string;
  links: LinkItem[];
}

export default function LinksPage() {
  const [groups, setGroups] = useState<LinkGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/links/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupCreated = (newGroup: LinkGroup) => {
    setGroups([...groups, newGroup]);
    setShowGroupModal(false);
  };

  const handleLinkCreated = (groupId: string, newLink: LinkItem) => {
    setGroups(groups.map(group =>
      group.id === groupId
        ? { ...group, links: [...group.links, newLink] }
        : group
    ));
    setShowLinkModal(false);
    setSelectedGroupId(null);
  };

  const handleDeleteLink = async (groupId: string, linkId: string) => {
    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setGroups(groups.map(group =>
          group.id === groupId
            ? { ...group, links: group.links.filter(l => l.id !== linkId) }
            : group
        ));
      }
    } catch (error) {
      console.error('Failed to delete link:', error);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const response = await fetch(`/api/links/groups/${groupId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setGroups(groups.filter(g => g.id !== groupId));
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-white">Links</h1>
          <p className="text-slate-400 mt-2">Organize links into groups</p>
        </div>
        <button
          onClick={() => setShowGroupModal(true)}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
        >
          + Add Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="border-2 border-dashed border-slate-600 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-2xl font-bold text-white mb-2">No groups yet</h2>
          <p className="text-slate-400 mb-6">Create your first group and start adding links.</p>
          <button
            onClick={() => setShowGroupModal(true)}
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Create First Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div key={group.id} className="border border-slate-700 rounded-2xl overflow-hidden bg-slate-800 flex flex-col h-full">
              <div className="p-4 border-b border-slate-700 flex justify-between items-start">
                <h2 className="text-lg font-bold text-white">{group.name}</h2>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setShowLinkModal(true);
                    }}
                    className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-900/30 rounded transition-colors"
                    title="Add link"
                  >
                    ➕
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                    title="Delete group"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {group.links.length === 0 ? (
                <div className="p-4 text-center text-slate-400 flex-1 flex items-center justify-center">
                  <p className="text-sm">No links yet</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="divide-y divide-slate-700">
                    {group.links.map((link) => (
                    <div key={link.id} className="p-3 hover:bg-slate-700 transition-colors group/link flex items-start justify-between gap-2">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-0"
                        >
                          <h3 className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors truncate">
                            {link.title}
                          </h3>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{link.url}</p>
                        </a>
                        <button
                          onClick={() => handleDeleteLink(group.id, link.id)}
                          className="flex-shrink-0 p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                          title="Delete link"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showGroupModal && (
        <CreateLinkGroupModal
          onClose={() => setShowGroupModal(false)}
          onGroupCreated={handleGroupCreated}
        />
      )}

      {showLinkModal && selectedGroupId && (
        <CreateLinkModal
          groupId={selectedGroupId}
          onClose={() => {
            setShowLinkModal(false);
            setSelectedGroupId(null);
          }}
          onLinkCreated={(link) => handleLinkCreated(selectedGroupId, link)}
        />
      )}
    </div>
  );
}

