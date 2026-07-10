'use client'

import { useState, useRef, useEffect } from 'react'

interface EditTopicModalProps {
  isOpen: boolean
  topicId: string
  topicTitle: string
  topicContent: string
  onClose: () => void
  onSuccess: () => void
}

export function EditTopicModal({
  isOpen,
  topicId,
  topicTitle,
  topicContent,
  onClose,
  onSuccess,
}: EditTopicModalProps) {
  const [title, setTitle] = useState(topicTitle)
  const [content, setContent] = useState(topicContent)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    setTitle(topicTitle)
    setContent(topicContent)
  }, [topicTitle, topicContent])

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
      const response = await fetch(`/api/wiki/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update topic')
      }

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
      className="backdrop:bg-black/70 rounded-2xl shadow-2xl max-w-2xl w-full p-6 bg-lucina-white border border-lucina-rose"
      onClose={handleClose}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-lucina-primary">Edit Topic</h2>
          <p className="text-lucina-muted text-sm mt-1">Update topic details</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-lucina-primary mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Topic title"
              className="w-full px-4 py-2 border border-lucina-rose rounded-xl focus:outline-none focus:ring-2 focus:ring-lucina-secondary focus:border-transparent bg-lucina-surface text-lucina-primary placeholder-lucina-muted"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-lucina-primary mb-2">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your documentation here..."
              rows={8}
              className="w-full px-4 py-2 border border-lucina-rose rounded-xl focus:outline-none focus:ring-2 focus:ring-lucina-secondary focus:border-transparent bg-lucina-surface text-lucina-primary placeholder-lucina-muted resize-none"
              required
              disabled={loading}
            />
          </div>
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
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

