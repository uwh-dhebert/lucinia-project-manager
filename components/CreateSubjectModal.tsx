'use client'

import { useState, useRef, useEffect } from 'react'

interface CreateSubjectModalProps {
  isOpen: boolean
  topicId: string
  onClose: () => void
  onSuccess: () => void
}

export function CreateSubjectModal({
  isOpen,
  topicId,
  onClose,
  onSuccess,
}: CreateSubjectModalProps) {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [isOpen])

  const handleClose = () => {
    setTitle('')
    setError('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/wiki/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topicId, title }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create subject')
      }

      setTitle('')
      handleClose()
      onSuccess()
    } catch (err: any) {
      setError(err.message)
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
          <h2 className="text-2xl font-bold text-lucina-primary">Create Subject</h2>
          <p className="text-lucina-muted text-sm mt-1">Add a new subject to this topic</p>
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
            placeholder="e.g., Authentication"
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
            {loading ? 'Creating...' : 'Create Subject'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

