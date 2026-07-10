'use client';

import { useCallback, useEffect, useState } from 'react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { formatSummaryUpdatedAt } from '@/lib/project-summary';

interface ProjectSummary {
  content: string;
  updated_at: string;
}

interface SummaryTabProps {
  projectId: string;
}

export function SummaryTab({ projectId }: SummaryTabProps) {
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setError('');

    try {
      let response = await fetch(`/api/projects/${projectId}/summary`);
      let data: { summary?: ProjectSummary | null; tableMissing?: boolean; error?: string } =
        await response.json().catch(() => ({}));

      if (response.ok && data.tableMissing) {
        const setupRes = await fetch('/api/setup-summary', { method: 'POST' });
        if (!setupRes.ok) {
          setSummary(null);
          return;
        }
        response = await fetch(`/api/projects/${projectId}/summary`);
        data = await response.json().catch(() => ({}));
      }

      if (response.ok) {
        setSummary(data.summary ?? null);
        return;
      }

      if (response.status === 404) {
        setSummary(null);
        return;
      }

      const message = data.error || '';
      if (
        message.toLowerCase().includes('could not find the table') ||
        message.toLowerCase().includes('schema cache') ||
        message.toLowerCase().includes('does not exist')
      ) {
        setSummary(null);
        return;
      }

      setError(message || 'Failed to load summary');
    } catch {
      if (!options?.silent) {
        setSummary(null);
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');

    try {
      await fetch('/api/setup-summary', { method: 'POST' });

      const response = await fetch(`/api/projects/${projectId}/summary`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate summary');
      }

      const data = await response.json();
      if (!data.summary?.content) {
        throw new Error('Summary was generated but not saved');
      }

      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lucina-secondary" />
        <p className="text-lucina-muted mt-2">Loading summary...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="text-xl font-bold text-lucina-primary">Project Summary</h3>
          <p className="text-sm text-lucina-muted mt-1">
            AI-generated overview from notes, design doc, and stories
          </p>
          {summary && formatSummaryUpdatedAt(summary.updated_at) && (
            <p className="text-sm text-lucina-muted mt-2">
              Last updated:{' '}
              <span className="font-medium text-lucina-primary">
                {formatSummaryUpdatedAt(summary.updated_at)}
              </span>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="shrink-0 px-4 py-2 bg-lucina-rose text-lucina-primary rounded-lg hover:bg-lucina-rose-hover transition-colors font-medium disabled:opacity-50"
        >
          {generating ? 'Generating...' : summary ? '🔄 Regenerate' : '✨ Generate Summary'}
        </button>
      </div>

      {error && !generating && (
        <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {generating && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lucina-secondary mb-4" />
          <p className="text-lucina-muted">Summarizing project with Grok...</p>
        </div>
      )}

      {!generating && summary?.content && (
        <div className="bg-lucina-surface border border-lucina-rose rounded-lg p-4">
          <MarkdownRenderer content={summary.content} />
        </div>
      )}

      {!generating && !summary?.content && !error && (
        <div className="text-center py-12 border border-dashed border-lucina-rose rounded-xl">
          <div className="text-4xl mb-4">📋</div>
          <h4 className="text-lg font-semibold text-lucina-primary mb-2">No summary yet</h4>
          <p className="text-lucina-muted mb-6 max-w-md mx-auto">
            Generate a summary to combine your notes, design document, and stories into one
            stakeholder-friendly overview.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors disabled:opacity-50"
          >
            Generate Summary
          </button>
        </div>
      )}
    </div>
  );
}