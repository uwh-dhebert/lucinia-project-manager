'use client'

import { useState, useRef, useEffect } from 'react'

interface EditSubjectModalProps {
  isOpen: boolean
  subjectId: string
  subjectTitle: string
  onClose: () => void
  onSuccess: () => void
  onDelete: () => void
}

export function EditSubjectModal({
  isOpen,
  subjectId,
  subjectTitle,
  onClose,
  onSuccess,
  onDelete,
}: EditSubjectModalProps) {
  const [title, setTitle] = useState(subjectTitle)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    setTitle(subjectTitle)
  }, [subjectTitle])

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [isOpen])

  const handleClose = () => {
    setError('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/wiki/subjects/${subjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update subject')
      }

      handleClose()
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this subject and all its content items?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/wiki/${subjectId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        handleClose()
        onDelete()
      }
    } catch (err) {
      setError('Failed to delete subject')
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/70 rounded-2xl shadow-2xl max-w-md w-full p-6 bg-lucina-white border border-lucina-rose"
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-lucina-primary">Edit Subject</h2>
          <p className="text-lucina-muted text-sm mt-1">Update subject details</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-lucina-primary mb-2">
            Subject Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Subject title"
            className="w-full px-4 py-2 border border-lucina-rose rounded-xl focus:outline-none focus:ring-2 focus:ring-lucina-secondary focus:border-transparent bg-lucina-surface text-lucina-primary placeholder-lucina-muted"
            required
            disabled={loading}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 border border-lucina-rose text-lucina-secondary font-medium rounded-full hover:bg-lucina-surface transition-colors disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          className="w-full px-4 py-2.5 border border-red-300 text-red-600 font-medium rounded-full hover:bg-red-900/20 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          🗑️ Delete Subject
        </button>
      </form>
    </dialog>
  )
}

