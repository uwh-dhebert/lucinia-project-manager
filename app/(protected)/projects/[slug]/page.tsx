'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { EditProjectModal } from '@/components/EditProjectModal'
import { DesignDocumentModal } from '@/components/DesignDocumentModal'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { StoriesTab } from '@/components/StoriesTab'
import { NotesTab } from '@/components/NotesTab'
import { ActionsMenu } from '@/components/ActionsMenu'
import { ShareProjectModal } from '@/components/ShareProjectModal'

interface Project {
  id: string
  name: string
  slug: string
  description: string
  ownerId: string
  isOwner?: boolean
  isShared?: boolean
  createdAt: string
  updatedAt: string
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [designDocModalOpen, setDesignDocModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'notes' | 'design-doc' | 'stories'>('notes')
  const [designDocContent, setDesignDocContent] = useState<string>('')
  const [isEditingDesignDoc, setIsEditingDesignDoc] = useState(false)

  useEffect(() => {
    loadProject()
  }, [slug])

  // Load design doc after project is loaded
  useEffect(() => {
    if (project?.id) {
      loadDesignDoc()
    }
  }, [project?.id])

  const loadProject = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const projects = await response.json()
        const found = projects.find((p: Project) => p.slug === slug)
        if (found) {
          setProject(found)
        } else {
          setError('Project not found')
        }
      }
    } catch (err) {
      setError('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const loadDesignDoc = async () => {
    try {
      const response = await fetch(`/api/projects/${project?.id}/design-doc-save`)
      if (response.ok) {
        const data = await response.json()
        if (data.designDoc?.content) {
          setDesignDocContent(data.designDoc.content)
        }
      }
    } catch (err) {
      console.error('Error loading design doc:', err)
    }
  }

  const handleDelete = async () => {
    if (!project) return
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.push('/projects')
      }
    } catch (err) {
      alert('Failed to delete project')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lucina-secondary"></div>
        <p className="text-lucina-muted mt-2">Loading project...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Link href="/projects" className="text-lucina-secondary hover:underline">
          ← Back to Projects
        </Link>
        <div className="border border-red-300 rounded-2xl p-8 text-center bg-red-50">
          <p className="text-red-600">{error || 'Project not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with Actions Menu */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <Link href="/projects" className="text-lucina-secondary hover:underline mb-4 inline-block">
            ← Back to Projects
          </Link>
          <h1 className="text-4xl font-bold text-lucina-primary mt-2">{project.name}</h1>
          {project.isShared && (
            <span className="mt-2 inline-block text-sm font-medium text-lucina-secondary bg-lucina-surface px-3 py-1 rounded-full">
              Shared with you
            </span>
          )}
          {project.description && (
            <p className="text-lucina-muted mt-2">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {project.isOwner !== false && (
            <button
              onClick={() => setShareModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-lucina-primary bg-lucina-rose border-2 border-lucina-dark rounded-xl hover:bg-lucina-rose-hover transition-colors"
            >
              Share
            </button>
          )}
          <ActionsMenu
          project={project}
          onEdit={() => setEditModalOpen(true)}
          onDelete={handleDelete}
          canDelete={project.isOwner !== false}
          onGenerateDesignDoc={() => setDesignDocModalOpen(true)}
          onDownloadDesignDoc={() => {
            // Download design doc functionality
          }}
        />
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <div className="flex gap-4 border-b border-lucina-rose">
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'notes'
                ? 'text-lucina-secondary border-b-2 border-lucina-secondary'
                : 'text-lucina-muted hover:text-lucina-secondary'
            }`}
          >
            📝 Notes
          </button>
          <button
            onClick={() => setActiveTab('design-doc')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'design-doc'
                ? 'text-lucina-secondary border-b-2 border-lucina-secondary'
                : 'text-lucina-muted hover:text-lucina-secondary'
            }`}
          >
            📄 Design Doc
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'stories'
                ? 'text-lucina-secondary border-b-2 border-lucina-secondary'
                : 'text-lucina-muted hover:text-lucina-secondary'
            }`}
          >
            📖 Stories
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'notes' && (
          <div className="bg-lucina-white border border-lucina-rose rounded-2xl p-6 min-h-96">
            <NotesTab projectId={project.id} />
          </div>
        )}

        {activeTab === 'design-doc' && (
          <div className="bg-lucina-white border border-lucina-rose rounded-2xl p-6 min-h-96">
            {designDocContent ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-lucina-primary">Project Design Document</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingDesignDoc(!isEditingDesignDoc)}
                      className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                        isEditingDesignDoc
                          ? 'bg-green-600 hover:bg-green-700 text-lucina-primary'
                          : 'bg-lucina-surface hover:bg-lucina-rose-hover text-lucina-primary'
                      }`}
                    >
                      {isEditingDesignDoc ? '✓ Done Editing' : '✏️ Edit'}
                    </button>
                    <button
                      onClick={() => setDesignDocModalOpen(true)}
                      className="px-4 py-2 bg-lucina-rose text-lucina-primary rounded-lg hover:bg-lucina-rose-hover transition-colors font-medium"
                    >
                      🔄 Regenerate
                    </button>
                  </div>
                </div>

                {isEditingDesignDoc ? (
                  <textarea
                    value={designDocContent}
                    onChange={(e) => setDesignDocContent(e.target.value)}
                    onBlur={async () => {
                      // Save to database when editing is done
                      try {
                        await fetch(`/api/projects/${project?.id}/design-doc-save`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ content: designDocContent }),
                        });
                      } catch (err) {
                        console.error('Error saving design doc:', err);
                      }
                    }}
                    className="w-full h-96 px-4 py-3 bg-lucina-primary border border-lucina-rose rounded-lg text-lucina-primary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-lucina-secondary"
                  />
                ) : (
                  <div className="bg-lucina-primary border border-lucina-rose rounded-lg p-4 overflow-auto max-h-96 text-lucina-secondary text-sm">
                    <MarkdownRenderer content={designDocContent} />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📄</div>
                <h3 className="text-lg font-semibold text-lucina-primary mb-2">No Design Document</h3>
                <p className="text-lucina-muted mb-6">Generate a design document to get started</p>
                <button
                  onClick={() => setDesignDocModalOpen(true)}
                  className="px-6 py-2 bg-gradient-to-r from-lucina-rose to-lucina-rose-hover text-lucina-primary font-medium rounded-full hover:from-lucina-rose-hover hover:to-lucina-secondary transition-colors"
                >
                  🚀 Generate Design Doc
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stories' && (
          <div className="bg-lucina-white border border-lucina-rose rounded-2xl p-6 min-h-96">
            <StoriesTab
              projectId={project.id}
              designDocContent={designDocContent}
              onStoriesGenerated={(stories) => {
                // Stories generated callback
              }}
            />
          </div>
        )}
      </div>

      {/* Tabs */}
       <ShareProjectModal
         isOpen={shareModalOpen}
         projectId={project.id}
         projectName={project.name}
         onClose={() => setShareModalOpen(false)}
       />

       <EditProjectModal
         isOpen={editModalOpen}
         projectId={project.id}
         projectName={project.name}
         projectDescription={project.description}
         onClose={() => setEditModalOpen(false)}
         onSuccess={() => loadProject()}
       />

       {/* Design Document Modal */}
       <DesignDocumentModal
         isOpen={designDocModalOpen}
         onClose={() => setDesignDocModalOpen(false)}
         projectName={project.name}
         projectId={project.id}
          onSave={async (content) => {
            setDesignDocContent(content)
            setDesignDocModalOpen(false)
            // Reload design doc to ensure it's synced
            setTimeout(() => loadDesignDoc(), 500)
          }}
       />
     </div>
   )
 }

