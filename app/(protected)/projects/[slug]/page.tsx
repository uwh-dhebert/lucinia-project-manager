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

interface Project {
  id: string
  name: string
  slug: string
  description: string
  ownerId: string
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
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-slate-400 mt-2">Loading project...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Link href="/projects" className="text-blue-400 hover:underline">
          ← Back to Projects
        </Link>
        <div className="border border-red-700 rounded-2xl p-8 text-center bg-red-900/30">
          <p className="text-red-400">{error || 'Project not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with Actions Menu */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <Link href="/projects" className="text-blue-400 hover:underline mb-4 inline-block">
            ← Back to Projects
          </Link>
          <h1 className="text-4xl font-bold text-white mt-2">{project.name}</h1>
          {project.description && (
            <p className="text-slate-400 mt-2">{project.description}</p>
          )}
        </div>
        <ActionsMenu
          project={project}
          onEdit={() => setEditModalOpen(true)}
          onDelete={handleDelete}
          onGenerateDesignDoc={() => setDesignDocModalOpen(true)}
          onDownloadDesignDoc={() => {
            // Download design doc functionality
          }}
        />
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <div className="flex gap-4 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'notes'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            📝 Notes
          </button>
          <button
            onClick={() => setActiveTab('design-doc')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'design-doc'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            📄 Design Doc
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'stories'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            📖 Stories
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'notes' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 min-h-96">
            <NotesTab projectId={project.id} />
          </div>
        )}

        {activeTab === 'design-doc' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 min-h-96">
            {designDocContent ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-white">Project Design Document</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingDesignDoc(!isEditingDesignDoc)}
                      className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                        isEditingDesignDoc
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-white'
                      }`}
                    >
                      {isEditingDesignDoc ? '✓ Done Editing' : '✏️ Edit'}
                    </button>
                    <button
                      onClick={() => setDesignDocModalOpen(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
                    className="w-full h-96 px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 overflow-auto max-h-96 text-slate-300 text-sm">
                    <MarkdownRenderer content={designDocContent} />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📄</div>
                <h3 className="text-lg font-semibold text-white mb-2">No Design Document</h3>
                <p className="text-slate-400 mb-6">Generate a design document to get started</p>
                <button
                  onClick={() => setDesignDocModalOpen(true)}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-full hover:from-purple-500 hover:to-purple-600 transition-colors"
                >
                  🚀 Generate Design Doc
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stories' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 min-h-96">
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

