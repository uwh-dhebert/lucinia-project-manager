import { useState } from 'react';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';

interface Note {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
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

  const handleAddNote = () => {
    if (!newNoteText.trim()) {
      setError('Note cannot be empty');
      return;
    }

    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      content: newNoteText,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setNotes([newNote, ...notes]);
    setNewNoteText('');
    setError(null);
  };

  const handleUpdateNote = (id: string) => {
    if (!editText.trim()) {
      setError('Note cannot be empty');
      return;
    }

    setNotes(
      notes.map((note) =>
        note.id === id
          ? { ...note, content: editText, updatedAt: new Date() }
          : note
      )
    );
    setEditingId(null);
    setEditText('');
    setError(null);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter((note) => note.id !== id));
  };

  const handleStartEdit = (note: Note) => {
    setEditingId(note.id);
    setEditText(note.content);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Add Note Input */}
      <div className="bg-slate-700 border border-slate-600 rounded-lg p-4">
        <div className="space-y-3">
          <textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Add a new note..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleAddNote}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Add Note
            </button>
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No notes yet. Create one to get started!</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="bg-slate-700 border border-slate-600 rounded-lg p-4"
            >
              {editingId === note.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleUpdateNote(note.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                    >
                      <Check size={16} />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditText('');
                      }}
                      className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-500 transition-colors flex items-center gap-1"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-white whitespace-pre-wrap">{note.content}</p>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-400">
                      {note.updatedAt.toLocaleDateString()} at{' '}
                      {note.updatedAt.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(note)}
                        className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                        title="Edit note"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
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

