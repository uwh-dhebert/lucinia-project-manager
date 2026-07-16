'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Copy, Download, Save } from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { formatDesignDocDate, getDesignDocBody, parseDesignDocVersion } from '@/lib/design-doc';

export interface SavedDesignDoc {
  content: string;
  updated_at: string;
}

interface DesignDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
  regenerateOnOpen?: boolean;
  existingContent?: string;
  onSave?: (designDoc: SavedDesignDoc) => Promise<void>;
}

export function DesignDocumentModal({
  isOpen,
  onClose,
  projectName,
  projectId,
  regenerateOnOpen = false,
  existingContent = '',
  onSave,
}: DesignDocumentModalProps) {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const runGenerate = useCallback(async (baseContent?: string) => {
    setIsLoading(true);
    setError(null);
    setMarkdownContent('');

    try {
      const response = await fetch(`/api/projects/${projectId}/design-doc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseContent: baseContent || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate document');
      }

      const data = await response.json();
      setMarkdownContent(data.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setIsCopied(false);

    if (regenerateOnOpen) {
      void runGenerate(existingContent);
    }
  }, [isOpen, regenerateOnOpen, existingContent, runGenerate]);

  if (!isOpen) {
    return null;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    if (typeof window === 'undefined') return;

    try {
      const element = document.createElement('a');
      const file = new Blob([markdownContent], { type: 'text/markdown' });
      element.href = URL.createObjectURL(file);
      element.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-design-doc.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href);
    } catch (err) {
      console.error('Error downloading file:', err);
    }
  };

  const handleSave = async () => {
    if (!onSave || !markdownContent) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/design-doc-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: markdownContent }),
      });

      if (!response.ok) {
        setError('Failed to save design document');
        return;
      }

      const data = await response.json();
      await onSave({
        content: data.designDoc.content,
        updated_at: data.designDoc.updated_at,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-lucina-white border border-lucina-rose rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-lucina-rose to-lucina-rose-hover px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-lucina-primary">
              {markdownContent ? 'Project Design Document' : 'Generate Design Document'}
            </h3>
            {markdownContent && (
              <p className="text-sm text-lucina-primary/80 mt-1">
                Document Version: {parseDesignDocVersion(markdownContent)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-lucina-primary hover:bg-lucina-rose-hover p-1 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!markdownContent && !isLoading && !error && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📄</div>
              <h4 className="text-lg font-semibold text-lucina-primary mb-2">
                Generate Project Design Document
              </h4>
              <p className="text-lucina-muted mb-6">
                Uses your <strong>project notes</strong> (plus name and description) as the
                source material for Grok to write the design document for{' '}
                <strong>{projectName}</strong>.
              </p>
              <div className="space-y-3 text-sm text-lucina-muted">
                <p>📋 What gets included:</p>
                <ul className="list-none space-y-1">
                  <li>✓ All project notes (mappings, SQL, requirements)</li>
                  <li>✓ Project name &amp; description</li>
                  <li>✓ Prior design doc (if regenerating)</li>
                  <li>✓ Standard sections + data mapping tables from notes</li>
                </ul>
                <p className="text-xs mt-3">
                  Tip: put detailed requirements and field mappings in Notes before generating.
                </p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lucina-secondary mb-4"></div>
              <p className="text-lucina-muted">
                Generating from project notes with Grok reasoning model...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-800 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {markdownContent && (
            <div className="bg-lucina-surface border border-lucina-rose rounded-lg p-4 overflow-auto max-h-[50vh]">
              <MarkdownRenderer content={getDesignDocBody(markdownContent)} />
            </div>
          )}
        </div>

        {markdownContent && (
          <div className="border-t border-lucina-rose bg-lucina-surface px-6 py-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void runGenerate(markdownContent)}
              disabled={isLoading || isSaving}
              className="px-4 py-2 bg-lucina-rose text-lucina-primary rounded-lg hover:bg-lucina-rose-hover transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Regenerating...' : '🔄 Regenerate'}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 min-w-[140px] px-4 py-2 bg-lucina-white text-lucina-primary rounded-lg hover:bg-lucina-rose-hover transition-colors flex items-center justify-center gap-2"
            >
              <Copy size={18} />
              {isCopied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 min-w-[140px] px-4 py-2 bg-lucina-rose text-lucina-primary rounded-lg hover:bg-lucina-rose-hover transition-colors flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Download as Markdown
            </button>
            {onSave && (
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving || isLoading}
                className="flex-1 min-w-[140px] px-4 py-2 bg-green-600 text-lucina-primary rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {isSaving ? 'Saving...' : 'Save to Project'}
              </button>
            )}
          </div>
        )}

        {!markdownContent && !isLoading && !error && (
          <div className="border-t border-lucina-rose bg-lucina-surface px-6 py-4">
            <button
              type="button"
              onClick={() => void runGenerate()}
              className="w-full px-6 py-3 bg-gradient-to-r from-lucina-rose to-lucina-rose-hover text-lucina-primary font-semibold rounded-lg hover:from-lucina-rose-hover hover:to-lucina-secondary transition-colors"
            >
              🚀 Generate Design Document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}