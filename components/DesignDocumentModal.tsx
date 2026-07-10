import { useState } from 'react';
import { X, Copy, Download, Save } from 'lucide-react';

interface DesignDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
  onSave?: (content: string) => Promise<void>;
}

export function DesignDocumentModal({
  isOpen,
  onClose,
  projectName,
  projectId,
  onSave,
}: DesignDocumentModalProps) {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setMarkdownContent('');

    try {
      const response = await fetch(`/api/projects/${projectId}/design-doc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
  };

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
      // Save to database
      const response = await fetch(`/api/projects/${projectId}/design-doc-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: markdownContent }),
      });

      if (response.ok) {
        await onSave(markdownContent);
      } else {
        setError('Failed to save design document');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-lucina-white border border-lucina-rose rounded-2xl w-full max-w-4xl max-h-96 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-lucina-rose to-lucina-rose-hover px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-lucina-primary">
            {markdownContent ? 'Project Design Document' : 'Generate Design Document'}
          </h3>
          <button
            onClick={onClose}
            className="text-lucina-primary hover:bg-lucina-rose-hover p-1 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!markdownContent && !isLoading && !error && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📄</div>
              <h4 className="text-lg font-semibold text-lucina-primary mb-2">
                Generate Project Design Document
              </h4>
              <p className="text-lucina-muted mb-6">
                Use xAI Grok's reasoning model to automatically generate a comprehensive
                Project Design Document for <strong>{projectName}</strong>
              </p>
              <div className="space-y-3 text-sm text-lucina-muted">
                <p>📋 Includes all key sections:</p>
                <ul className="list-none space-y-1">
                  <li>✓ Problem Statement & Objectives</li>
                  <li>✓ In/Out of Scope & Guiding Principles</li>
                  <li>✓ Architecture & Phased Approach</li>
                  <li>✓ Success Criteria & Risks</li>
                  <li>✓ Governance & Timeline</li>
                </ul>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lucina-secondary mb-4"></div>
              <p className="text-lucina-muted">Generating document with Grok reasoning model...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-800 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {markdownContent && (
            <div className="bg-lucina-primary border border-lucina-rose rounded-lg p-4 overflow-auto max-h-96">
              <div className="text-lucina-secondary text-sm whitespace-pre-wrap font-mono">
                {markdownContent}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {markdownContent && (
          <div className="border-t border-lucina-rose bg-lucina-primary px-6 py-4 flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 px-4 py-2 bg-lucina-surface text-lucina-primary rounded-lg hover:bg-lucina-rose-hover transition-colors flex items-center justify-center gap-2"
            >
              <Copy size={18} />
              {isCopied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 px-4 py-2 bg-lucina-rose text-lucina-primary rounded-lg hover:bg-lucina-rose-hover transition-colors flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Download as Markdown
            </button>
            {onSave && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-green-600 text-lucina-primary rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {isSaving ? 'Saving...' : 'Save to Project'}
              </button>
            )}
          </div>
        )}

        {!markdownContent && !isLoading && !error && (
          <div className="border-t border-lucina-rose bg-lucina-primary px-6 py-4">
            <button
              onClick={handleGenerate}
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

