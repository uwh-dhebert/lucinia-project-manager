'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react'

interface ContentItem {
  id: string
  title?: string
  content: string
  order: number
}

interface Subject {
  id: string
  title: string
  slug: string
  order: number
  contentItems?: ContentItem[]
}

interface Topic {
  id: string
  title: string
  slug: string
  order: number
  subjects?: Subject[]
}

export function WikiTreeNav() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTopics()
  }, [])

  const loadTopics = async () => {
    try {
      const response = await fetch('/api/wiki?tree=true')
      if (response.ok) {
        const data = await response.json()
        setTopics(data)
      }
    } catch (error) {
      console.error('Failed to load topics:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTopic = (topicId: string) => {
    const newExpanded = new Set(expandedTopics)
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId)
    } else {
      newExpanded.add(topicId)
    }
    setExpandedTopics(newExpanded)
  }

  if (loading) {
    return (
      <div className="px-4 py-2 text-sm text-lucina-muted">
        <span className="animate-pulse">Loading wiki...</span>
      </div>
    )
  }

  if (topics.length === 0) {
    return (
      <div className="px-4 py-2 text-sm text-lucina-muted">
        <Link href="/wiki" className="hover:text-lucina-secondary transition-colors">
          📖 Wiki
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="px-4 py-2 text-sm font-semibold text-lucina-secondary flex items-center gap-2">
        <BookOpen className="w-4 h-4" />
        <span>Wiki</span>
      </div>

      {topics.map((topic) => (
        <div key={topic.id} className="space-y-1">
          {/* Topic Item */}
          <div className="flex items-center gap-1 px-2 text-sm">
            <button
              onClick={() => toggleTopic(topic.id)}
              className="p-0 hover:bg-lucina-surface rounded transition-colors"
            >
              {expandedTopics.has(topic.id) ? (
                <ChevronDown className="w-4 h-4 text-lucina-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-lucina-muted" />
              )}
            </button>
            <Link
              href={`/wiki/${topic.slug}`}
              className="flex-1 px-2 py-1.5 rounded hover:bg-lucina-surface/50 text-lucina-secondary hover:text-lucina-primary transition-colors"
            >
              {topic.title}
            </Link>
          </div>

          {/* Subjects (shown when expanded) */}
          {expandedTopics.has(topic.id) && topic.subjects && (
            <div className="space-y-1 pl-4">
              {topic.subjects.map((subject) => (
                <Link
                  key={subject.id}
                  href={`/wiki/${topic.slug}/${subject.slug}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-lucina-muted hover:bg-lucina-surface/50 hover:text-lucina-primary transition-colors"
                >
                  <span className="w-4" />
                  <span className="text-xs text-lucina-muted">•</span>
                  <span className="flex-1 truncate">{subject.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

