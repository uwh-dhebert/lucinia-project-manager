'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

export default function ProjectDocumentationPage() {
  const params = useParams()
  const slug = params.slug as string
  const [topics, setTopics] = useState<any[]>([])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href={`/projects/${slug}`} className="text-lucina-secondary hover:underline mb-4 inline-block">
          ← Back to Project
        </Link>
        <h1 className="text-4xl font-bold text-lucina-primary mt-2">Documentation</h1>
        <p className="text-lucina-muted mt-2">Wiki-style documentation for this project</p>
      </div>

      {/* Actions */}
      <div>
        <button className="px-6 py-2.5 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors">
          + New Topic
        </button>
      </div>

      {/* Topics List */}
      {topics.length === 0 ? (
        <div className="border-2 border-dashed border-lucina-rose rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">📖</div>
          <h2 className="text-2xl font-bold text-lucina-primary mb-2">No Documentation Yet</h2>
          <p className="text-lucina-muted mb-6">Start by creating your first documentation topic</p>
          <button className="px-6 py-3 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors">
            + Create First Topic
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              href={`/projects/${slug}/documentation/${topic.slug}`}
              className="block border border-lucina-rose rounded-2xl p-6 hover:border-lucina-rose hover:shadow-lg transition-all bg-lucina-white"
            >
              <h3 className="text-lg font-semibold text-lucina-primary">{topic.title}</h3>
              {topic.description && (
                <p className="text-lucina-muted text-sm mt-1">{topic.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

