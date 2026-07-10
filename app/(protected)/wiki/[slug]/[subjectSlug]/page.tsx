'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CreateContentItemModal } from '@/components/CreateContentItemModal'
import { EditContentItemModal } from '@/components/EditContentItemModal'

interface ContentItem {
  id: string
  title?: string
  content: string
  order: number
  createdAt: string
  updatedAt: string
}

interface Subject {
  id: string
  topicId: string
  title: string
  slug: string
  order: number
  createdAt?: string
  updatedAt?: string
  contentItems?: ContentItem[]
}

interface Topic {
  id: string
  title: string
  slug: string
  order: number
  createdAt: string
  updatedAt: string
  subjects?: Subject[]
}

export default function SubjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const topicSlug = params.slug as string
  const subjectSlug = params.subjectSlug as string

  const [topic, setTopic] = useState<Topic | null>(null)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [topicSlug, subjectSlug])

  const loadData = async () => {
    try {
      const response = await fetch('/api/wiki')
      if (response.ok) {
        const topics = await response.json()
        const foundTopic = topics.find((t: Topic) => t.slug === topicSlug)

        if (!foundTopic) {
          setError('Topic not found')
          return
        }

        const foundSubject = foundTopic.subjects?.find((s: Subject) => s.slug === subjectSlug)

        if (!foundSubject) {
          setError('Subject not found')
          return
        }

        setTopic(foundTopic)
        setSubject(foundSubject)
      } else {
        setError('Failed to load data')
      }
    } catch (err) {
      setError('Failed to load subject')
    } finally {
      setLoading(false)
    }
  }



  const handleDeleteSubject = async () => {
    if (!subject) return
    if (!confirm('Are you sure you want to delete this subject and all its content?')) return

    try {
      const response = await fetch(`/api/wiki/subjects/${subject.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.push(`/wiki/${topicSlug}`)
      } else {
        alert('Failed to delete subject')
      }
    } catch (err) {
      alert('Failed to delete subject')
    }
  }

  const handleEditItem = (item: ContentItem) => {
    setEditingItem(item)
    setEditModalOpen(true)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lucina-secondary"></div>
        <p className="text-lucina-muted mt-2">Loading subject...</p>
      </div>
    )
  }

  if (error || !topic || !subject) {
    return (
      <div className="space-y-6">
        <Link href="/wiki" className="text-lucina-secondary hover:underline">
          ← Back to Wiki
        </Link>
        <div className="border border-red-300 rounded-2xl p-8 text-center bg-red-50">
          <p className="text-red-600">{error || 'Subject not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-lucina-muted">
          <Link href="/wiki" className="text-lucina-secondary hover:underline">
            Wiki
          </Link>
          <span>/</span>
          <Link href={`/wiki/${topic.slug}`} className="text-lucina-secondary hover:underline">
            {topic.title}
          </Link>
          <span>/</span>
          <span className="text-lucina-secondary">{subject.title}</span>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-lucina-primary">{subject.title}</h1>
        <p className="text-lucina-muted mt-2">Topic: {topic.title}</p>
      </div>

      {/* Meta */}
      <div className="flex gap-6 text-sm text-lucina-muted">
        {subject.createdAt && <span>Created: {new Date(subject.createdAt).toLocaleDateString()}</span>}
        {subject.updatedAt && <span>Updated: {new Date(subject.updatedAt).toLocaleDateString()}</span>}
      </div>

      {/* Content Items Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-lucina-primary">
          Content ({subject.contentItems?.length || 0})
        </h2>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-6 py-2.5 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors"
        >
          + Add Content
        </button>
      </div>

      {/* Content Items List */}
      {subject.contentItems && subject.contentItems.length > 0 ? (
        <div className="space-y-4">
          {subject.contentItems.map((item) => (
            <div
              key={item.id}
              className="border border-lucina-rose rounded-2xl p-6 bg-lucina-white hover:border-lucina-rose transition-colors"
            >
              {/* Item Header */}
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex-1">
                  {item.title && (
                    <h3 className="text-lg font-semibold text-lucina-primary mb-2">{item.title}</h3>
                  )}
                  <p className="text-lucina-secondary whitespace-pre-wrap">{item.content}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEditItem(item)}
                    className="px-3 py-1.5 text-sm bg-lucina-rose text-lucina-primary rounded hover:bg-lucina-rose-hover transition-colors"
                  >
                    ✏️ Edit
                  </button>
                </div>
              </div>

              {/* Item Meta */}
              <div className="text-xs text-lucina-muted border-t border-lucina-rose pt-3">
                Updated: {new Date(item.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-lucina-rose rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-2xl font-bold text-lucina-primary mb-2">No Content Yet</h3>
          <p className="text-lucina-muted mb-6">Add your first content item to get started</p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-6 py-3 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors"
          >
            + Create First Content
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 flex-wrap pt-6 border-t border-lucina-rose">
        <button
          onClick={() => alert('Edit functionality coming soon')}
          className="px-6 py-2.5 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors"
        >
          ✏️ Edit Subject
        </button>
        <button
          onClick={handleDeleteSubject}
          className="px-6 py-2.5 border border-red-300 text-red-600 font-medium rounded-full hover:bg-red-900/20 transition-colors"
        >
          🗑️ Delete Subject
        </button>
      </div>

      {/* Create Content Modal */}
      <CreateContentItemModal
        isOpen={createModalOpen}
        subjectId={subject.id}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false)
          loadData()
        }}
      />

      {/* Edit Content Modal */}
      {editingItem && (
        <EditContentItemModal
          isOpen={editModalOpen}
          contentItemId={editingItem.id}
          contentItemTitle={editingItem.title}
          contentItemContent={editingItem.content}
          onClose={() => {
            setEditModalOpen(false)
            setEditingItem(null)
          }}
          onSuccess={() => {
            setEditModalOpen(false)
            setEditingItem(null)
            loadData()
          }}
          onDelete={() => {
            setEditModalOpen(false)
            setEditingItem(null)
            loadData()
          }}
        />
      )}
    </div>
  )
}

