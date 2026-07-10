'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

export default function ProjectLinksPage() {
  const params = useParams()
  const slug = params.slug as string
  const [links, setLinks] = useState<any[]>([])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href={`/projects/${slug}`} className="text-lucina-secondary hover:underline mb-4 inline-block">
          ← Back to Project
        </Link>
        <h1 className="text-4xl font-bold text-lucina-primary mt-2">Links</h1>
        <p className="text-lucina-muted mt-2">Project-specific links and resources</p>
      </div>

      {/* Actions */}
      <div>
        <button className="px-6 py-2.5 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors">
          + Add Link
        </button>
      </div>

      {/* Links List */}
      {links.length === 0 ? (
        <div className="border-2 border-dashed border-lucina-rose rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-2xl font-bold text-lucina-primary mb-2">No Links Yet</h2>
          <p className="text-lucina-muted mb-6">Add links and resources related to this project</p>
          <button className="px-6 py-3 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors">
            + Add First Link
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border border-lucina-rose rounded-2xl p-6 hover:border-lucina-rose hover:shadow-lg transition-all bg-lucina-white group"
            >
              <h3 className="text-lg font-semibold text-lucina-primary group-hover:text-lucina-secondary transition-colors truncate">
                {link.name}
              </h3>
              {link.description && (
                <p className="text-lucina-muted text-sm mt-1 line-clamp-2">{link.description}</p>
              )}
              <div className="mt-4 flex gap-2 flex-wrap">
                <span className="text-xs bg-lucina-surface text-lucina-secondary px-2 py-1 rounded-full">
                  {link.category}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

