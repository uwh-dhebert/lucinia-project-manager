'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesTabProps {
  projectId: string;
}

export function NotesTab({ projectId }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, [projectId]);

  const loadNotes = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/notes-save`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) {
      setError('Note cannot be empty');
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/notes-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteText }),
      });

      if (response.ok) {
        const data = await response.json();
        setNotes([data.note, ...notes]);
        setNewNoteText('');
        setError(null);
      } else {
        setError('Failed to save note');
      }
    } catch (err) {
      setError('Error saving note');
      console.error(err);
    }
  };

  const handleUpdateNote = async (id: string) => {
    if (!editText.trim()) {
      setError('Note cannot be empty');
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/notes-save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: id, content: editText }),
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(notes.map((n) => (n.id === id ? data.note : n)));
        setEditingId(null);
        setEditText('');
        setError(null);
      } else {
        setError('Failed to update note');
      }
    } catch (err) {
      setError('Error updating note');
      console.error(err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/notes-save`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: id }),
      });

      if (response.ok) {
        setNotes(notes.filter((n) => n.id !== id));
      } else {
        setError('Failed to delete note');
      }
    } catch (err) {
      setError('Error deleting note');
      console.error(err);
    }
  };

  const handleStartEdit = (note: Note) => {
    setEditingId(note.id);
    setEditText(note.content);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-lucina-surface border border-lucina-rose rounded-lg p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-lucina-primary">New Note</h3>
            <span className="text-xs text-lucina-muted">Markdown supported</span>
          </div>
          <MarkdownEditor
            value={newNoteText}
            onChange={setNewNoteText}
            placeholder="Write a note in markdown..."
            minRows={5}
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleAddNote}
              className="px-4 py-2 bg-lucina-rose text-lucina-primary rounded-lg hover:bg-lucina-rose-hover transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Add Note
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-lucina-muted">Loading notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lucina-muted">No notes yet. Create one to get started!</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="bg-lucina-surface border border-lucina-rose rounded-lg p-4"
            >
              {editingId === note.id ? (
                <div className="space-y-3">
                  <MarkdownEditor
                    value={editText}
                    onChange={setEditText}
                    placeholder="Edit note..."
                    minRows={5}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleUpdateNote(note.id)}
                      className="px-3 py-1 bg-green-600 text-lucina-primary rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                    >
                      <Check size={16} />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditText('');
                      }}
                      className="px-3 py-1 bg-lucina-rose text-lucina-primary rounded hover:bg-lucina-rose-hover transition-colors flex items-center gap-1"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <MarkdownRenderer content={note.content} />
                  <div className="flex justify-between items-center border-t border-lucina-rose pt-3">
                    <p className="text-xs text-lucina-muted">
                      {new Date(note.updatedAt || note.createdAt).toLocaleDateString()} at{' '}
                      {new Date(note.updatedAt || note.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(note)}
                        className="p-1 text-lucina-muted hover:text-lucina-secondary transition-colors"
                        title="Edit note"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-lucina-muted hover:text-red-600 transition-colors"
                        title="Delete note"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}