'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Folder, Link2, X } from 'lucide-react';

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

interface LinksTreeModalProps {
  onClose: () => void;
}

export default function LinksTreeModal({ onClose }: LinksTreeModalProps) {
  const [groups, setGroups] = useState<LinkGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/links/groups');
      if (response.ok) {
        const data: LinkGroup[] = await response.json();
        setGroups(data);
        // Expand all groups by default for quick access
        setExpandedGroups(new Set(data.map((g) => g.id)));
      }
    } catch (error) {
      console.error('Failed to load link groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="bg-lucina-white rounded-2xl shadow-2xl border border-lucina-rose w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-lucina-rose">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-lucina-secondary" />
            <h2 className="text-xl font-bold text-lucina-primary">Links</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-lucina-muted hover:text-lucina-primary hover:bg-lucina-surface rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lucina-secondary" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🔗</div>
              <p className="text-lucina-muted text-sm">No link groups yet</p>
              <a
                href="/links"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-sm text-lucina-secondary hover:text-lucina-secondary transition-colors"
              >
                Manage links →
              </a>
            </div>
          ) : (
            <div className="space-y-1">
              {groups.map((group) => {
                const isExpanded = expandedGroups.has(group.id);
                return (
                  <div key={group.id}>
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-lucina-surface/70 transition-colors group"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-lucina-muted flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-lucina-muted flex-shrink-0" />
                      )}
                      <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="text-sm font-semibold text-lucina-primary truncate flex-1">
                        {group.name}
                      </span>
                      <span className="text-xs text-lucina-muted flex-shrink-0">
                        {group.links?.length ?? 0}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="ml-4 border-l border-lucina-rose pl-2 mt-0.5 mb-1">
                        {!group.links?.length ? (
                          <p className="px-3 py-2 text-xs text-lucina-muted">No links</p>
                        ) : (
                          group.links.map((link) => (
                            <a
                              key={link.id}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-lucina-surface/70 transition-colors group/link"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-lucina-muted mt-0.5 flex-shrink-0 group-hover/link:text-lucina-secondary" />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-lucina-secondary group-hover/link:text-lucina-secondary truncate">
                                  {link.title}
                                </div>
                                <div className="text-xs text-lucina-muted truncate">{link.url}</div>
                              </div>
                            </a>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-lucina-rose flex justify-between items-center">
          <a
            href="/links"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-lucina-muted hover:text-lucina-secondary transition-colors"
          >
            Open links page
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-lucina-secondary bg-lucina-surface hover:bg-lucina-rose-hover rounded-full transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
