'use client'

import { useState, useRef, useEffect } from 'react'
import type { ParsedNotebook } from '@/lib/onepkg/parse-onepkg'

interface ImportOneNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type Phase = 'pick' | 'parsing' | 'preview' | 'importing'

export function ImportOneNoteModal({ isOpen, onClose, onSuccess }: ImportOneNoteModalProps) {
  const [phase, setPhase] = useState<Phase>('pick')
  const [notebook, setNotebook] = useState<ParsedNotebook | null>(null)
  const [notebookName, setNotebookName] = useState('')
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [isOpen])

  const reset = () => {
    setPhase('pick')
    setNotebook(null)
    setNotebookName('')
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = async (file: File) => {
    setError('')
    if (!file.name.toLowerCase().endsWith('.onepkg')) {
      setError('Please choose a .onepkg file (OneNote → Export → Notebook → OneNote Package).')
      return
    }
    setPhase('parsing')
    try {
      // Parsing happens entirely in the browser — the notebook file itself is
      // never uploaded, only the extracted text.
      const buffer = new Uint8Array(await file.arrayBuffer())
      const { parseOnepkg } = await import('@/lib/onepkg/parse-onepkg')
      const parsed = parseOnepkg(buffer, file.name)
      setNotebook(parsed)
      setNotebookName(parsed.name)
      setPhase('preview')
    } catch (err: any) {
      setError(err.message || 'Could not parse this .onepkg file.')
      setPhase('pick')
    }
  }

  const handleImport = async () => {
    if (!notebook) return
    setPhase('importing')
    setError('')
    try {
      const response = await fetch('/api/wiki/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notebookName: notebookName.trim() || notebook.name,
          sections: notebook.sections.map((s) => ({ title: s.title, text: s.text })),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      reset()
      onSuccess()
    } catch (err: any) {
      setError(err.message)
      setPhase('preview')
    }
  }

  const emptyCount = notebook?.sections.filter((s) => s.empty).length ?? 0

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/70 rounded-2xl shadow-2xl max-w-2xl w-full p-6 bg-lucina-white border border-lucina-rose"
      onClose={handleClose}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-lucina-primary">Import OneNote Notebook</h2>
          <p className="text-lucina-muted text-sm mt-1">
            Import a .onepkg export — the notebook becomes a topic, sections become subjects with
            their section-group structure preserved.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {phase === 'pick' && (
          <div
            className="border-2 border-dashed border-lucina-rose rounded-2xl p-10 text-center cursor-pointer hover:bg-lucina-surface/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files?.[0]
              if (file) handleFile(file)
            }}
          >
            <div className="text-5xl mb-3">📓</div>
            <p className="font-semibold text-lucina-primary">Drop a .onepkg file here or click to browse</p>
            <p className="text-xs text-lucina-muted mt-2">
              In OneNote desktop: File → Export → Notebook → OneNote Package (*.onepkg).
              Parsing happens in your browser; only extracted text is uploaded. Text is imported
              best-effort — formatting, images, and ink are not carried over, and
              password-protected sections cannot be read (remove the password in OneNote first).
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".onepkg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
          </div>
        )}

        {phase === 'parsing' && (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lucina-secondary"></div>
            <p className="text-lucina-muted mt-3">Extracting notebook…</p>
          </div>
        )}

        {(phase === 'preview' || phase === 'importing') && notebook && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-lucina-primary mb-2">
                Topic title
              </label>
              <input
                type="text"
                value={notebookName}
                onChange={(e) => setNotebookName(e.target.value)}
                className="w-full px-4 py-2 border border-lucina-rose rounded-xl focus:outline-none focus:ring-2 focus:ring-lucina-secondary focus:border-transparent bg-lucina-surface text-lucina-primary"
                disabled={phase === 'importing'}
              />
            </div>

            <div>
              <div className="text-sm font-medium text-lucina-primary mb-2">
                {notebook.sections.length} section{notebook.sections.length === 1 ? '' : 's'} found
                {emptyCount > 0 && (
                  <span className="ml-2 text-amber-700">
                    ({emptyCount} with no readable text — possibly password-protected)
                  </span>
                )}
              </div>
              <ul className="max-h-64 overflow-y-auto border border-lucina-rose rounded-xl divide-y divide-lucina-rose/50 bg-lucina-surface/30">
                {notebook.sections.map((section, idx) => (
                  <li key={idx} className="px-4 py-2 text-sm flex justify-between gap-3">
                    <span className="text-lucina-primary truncate">
                      {section.groupPath.length > 0 && (
                        <span className="text-lucina-muted">{section.groupPath.join(' / ')} / </span>
                      )}
                      <span className="font-semibold">{section.name}</span>
                    </span>
                    <span className={`whitespace-nowrap text-xs ${section.empty ? 'text-amber-700 font-semibold' : 'text-lucina-muted'}`}>
                      {section.empty
                        ? 'no text'
                        : `${section.text.length.toLocaleString()} chars`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 border border-lucina-rose text-lucina-secondary font-medium rounded-full hover:bg-lucina-surface transition-colors disabled:opacity-50"
            disabled={phase === 'importing' || phase === 'parsing'}
          >
            Cancel
          </button>
          {(phase === 'preview' || phase === 'importing') && (
            <button
              type="button"
              onClick={handleImport}
              className="flex-1 px-4 py-2.5 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors disabled:opacity-50"
              disabled={phase === 'importing'}
            >
              {phase === 'importing' ? 'Importing…' : 'Import notebook'}
            </button>
          )}
        </div>
      </div>
    </dialog>
  )
}
