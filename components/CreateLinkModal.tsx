'use client';

import { useState } from 'react';

interface LinkItem {
  id: string;
  title: string;
  url: string;
}

interface CreateLinkModalProps {
  groupId: string;
  onClose: () => void;
  onLinkCreated: (link: LinkItem) => void;
}

export default function CreateLinkModal({ groupId, onClose, onLinkCreated }: CreateLinkModalProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Link title is required');
      return;
    }

    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    // Basic URL validation
    try {
      new URL(url.trim());
    } catch {
      setError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId,
          title: title.trim(),
          url: url.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create link');
      }

      const link = await response.json();
      onLinkCreated(link);
      setTitle('');
      setUrl('');
    } catch (err: any) {
      setError(err.message || 'Failed to create link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-lucina-white rounded-2xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-lucina-primary mb-6">Add New Link</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-lucina-secondary mb-2">
              Link Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., GitHub, Stack Overflow"
              className="w-full px-4 py-2 bg-lucina-surface border border-lucina-rose rounded-lg text-lucina-primary placeholder-lucina-muted focus:outline-none focus:border-lucina-secondary transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="url" className="block text-sm font-medium text-lucina-secondary mb-2">
              URL
            </label>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2 bg-lucina-surface border border-lucina-rose rounded-lg text-lucina-primary placeholder-lucina-muted focus:outline-none focus:border-lucina-secondary transition-colors"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900 border border-red-300 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-lucina-surface text-lucina-primary font-medium rounded-lg hover:bg-lucina-rose-hover transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-lucina-rose text-lucina-primary font-medium rounded-lg hover:bg-lucina-rose-hover transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

