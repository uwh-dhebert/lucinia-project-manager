import { useState } from 'react';
import { Menu, X, Copy, Download, Edit2, Trash2, FileText } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

interface ActionsMenuProps {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  onGenerateDesignDoc: () => void;
  onDownloadDesignDoc: () => void;
}

export function ActionsMenu({
  project,
  onEdit,
  onDelete,
  onGenerateDesignDoc,
  onDownloadDesignDoc,
}: ActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        title="Actions menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50">
          {/* Project Details Section */}
          <div className="border-b border-slate-700 p-4 space-y-4">
            <h3 className="font-semibold text-white text-sm uppercase tracking-wide">
              Project Details
            </h3>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400 mb-1">Project ID</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-mono text-slate-300 truncate">
                    {project.id}
                  </p>
                  <button
                    onClick={() => copyToClipboard(project.id)}
                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                    title="Copy ID"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1">Slug</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-300">{project.slug}</p>
                  <button
                    onClick={() => copyToClipboard(project.slug)}
                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                    title="Copy slug"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Created</p>
                  <p className="text-sm text-slate-300">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Updated</p>
                  <p className="text-sm text-slate-300">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div className="p-4 space-y-2">
            <h3 className="font-semibold text-white text-sm uppercase tracking-wide mb-3">
              Actions
            </h3>

            <button
              onClick={() => {
                onGenerateDesignDoc();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-white hover:bg-slate-700 rounded-lg transition-colors text-sm"
            >
              <FileText size={18} />
              Generate Design Doc
            </button>

            <button
              onClick={() => {
                onDownloadDesignDoc();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-white hover:bg-slate-700 rounded-lg transition-colors text-sm"
            >
              <Download size={18} />
              Download Design Doc
            </button>

            <button
              onClick={() => {
                onEdit();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-white hover:bg-slate-700 rounded-lg transition-colors text-sm"
            >
              <Edit2 size={18} />
              Edit Project
            </button>

            <button
              onClick={() => {
                onDelete();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-red-400 hover:bg-red-900/30 rounded-lg transition-colors text-sm"
            >
              <Trash2 size={18} />
              Delete Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

