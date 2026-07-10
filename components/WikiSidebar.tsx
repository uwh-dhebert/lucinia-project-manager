'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Plus, BookOpen, Folder, FileText } from 'lucide-react'

interface ContentItem {
  id: string
  title?: string
  content?: string
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

interface TreeNodeProps {
  item: Topic | Subject | ContentItem
  type: 'topic' | 'subject' | 'content'
  topicSlug?: string
  isExpanded: boolean
  expandedNodes: Set<string>
  onToggle: (id: string) => void
  onAdd: (type: 'topic' | 'subject' | 'content', parentId?: string) => void
  level: number
  activeItem?: string
  onSelect?: (id: string, type: 'topic' | 'subject' | 'content') => void
}

function TreeNode({
  item,
  type,
  topicSlug,
  isExpanded,
  expandedNodes,
  onToggle,
  onAdd,
  level,
  activeItem,
  onSelect,
}: TreeNodeProps) {
  const hasChildren =
    (type === 'topic' && (item as Topic).subjects && (item as Topic).subjects!.length > 0) ||
    (type === 'subject' && (item as Subject).contentItems && (item as Subject).contentItems!.length > 0)

  const isActive = activeItem === item.id

  const handleSelect = () => {
    if (onSelect) {
      onSelect(item.id, type)
    }
  }

  // Get display title - use first 20 chars of content if title is missing for content items
  const getDisplayTitle = () => {
    if (item.title) {
      return item.title
    }
    if (type === 'content' && (item as ContentItem).content) {
      return (item as ContentItem).content!.substring(0, 20)
    }
    return 'Untitled'
  }

  let href = ''
  if (type === 'topic') {
    href = `/wiki/${(item as Topic).slug}`
  } else if (type === 'subject') {
    href = `/wiki/${topicSlug}/${(item as Subject).slug}`
  }

  const paddingLeft = level * 12

  return (
    <div className="select-none">
      {/* Node Container */}
      <div className="flex items-center gap-0.5 group" style={{ paddingLeft: `${paddingLeft}px` }}>
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            onClick={() => onToggle(item.id)}
            className="p-0.5 hover:bg-lucina-surface rounded transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-lucina-secondary" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-lucina-muted" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Node Content */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          {/* Icon */}
          {type === 'topic' && <BookOpen className="w-3.5 h-3.5 text-lucina-secondary flex-shrink-0" />}
          {type === 'subject' && <Folder className="w-3.5 h-3.5 text-lucina-secondary flex-shrink-0" />}
          {type === 'content' && <FileText className="w-3.5 h-3.5 text-lucina-muted flex-shrink-0" />}

           {/* Link or Label */}
           {href ? (
             <Link
               href={href}
               onClick={handleSelect}
               className={`flex-1 px-1 py-0.5 rounded text-xs truncate transition-colors ${
                 isActive
                   ? 'bg-lucina-surface text-lucina-secondary font-medium'
                   : 'text-lucina-secondary hover:text-lucina-primary hover:bg-lucina-surface/50'
               }`}
             >
               {getDisplayTitle()}
             </Link>
           ) : (
             <span className="flex-1 px-1 py-0.5 rounded text-xs truncate text-lucina-secondary">
               {getDisplayTitle()}
             </span>
           )}
        </div>

        {/* Add Button (appears on hover) */}
        {type !== 'content' && (
          <button
            onClick={() => onAdd(type === 'topic' ? 'subject' : 'content', item.id)}
            className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-lucina-secondary rounded transition-all hover:text-lucina-primary text-lucina-muted flex-shrink-0"
            title={`Add ${type === 'topic' ? 'subject' : 'content'}`}
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="space-y-0">
          {type === 'topic' &&
            (item as Topic).subjects?.map((subject) => (
              <TreeNode
                key={subject.id}
                item={subject}
                type="subject"
                topicSlug={(item as Topic).slug}
                isExpanded={expandedNodes.has(subject.id)}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onAdd={onAdd}
                level={level + 1}
                activeItem={activeItem}
                onSelect={onSelect}
              />
            ))}
          {type === 'subject' &&
            (item as Subject).contentItems?.map((content) => (
              <TreeNode
                key={content.id}
                item={content}
                type="content"
                topicSlug={topicSlug}
                isExpanded={false}
                expandedNodes={expandedNodes}
                onToggle={onToggle}
                onAdd={onAdd}
                level={level + 1}
                activeItem={activeItem}
                onSelect={onSelect}
              />
            ))}
        </div>
      )}
    </div>
  )
}

interface WikiSidebarProps {
  onItemSelect?: (id: string, type: 'topic' | 'subject' | 'content') => void
  activeItemId?: string
}

export function WikiSidebar({ onItemSelect, activeItemId }: WikiSidebarProps) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
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

  const toggleNode = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleAdd = useCallback((type: 'topic' | 'subject' | 'content', parentId?: string) => {
    if (type === 'topic') {
      window.location.href = '/wiki'
    } else if (type === 'subject' && parentId) {
      const topic = topics.find((t) => t.id === parentId)
      if (topic) {
        window.location.href = `/wiki/${topic.slug}`
      }
    } else if (type === 'content' && parentId) {
      for (const topic of topics) {
        const subject = topic.subjects?.find((s) => s.id === parentId)
        if (subject) {
          window.location.href = `/wiki/${topic.slug}/${subject.slug}`
          return
        }
      }
    }
  }, [topics])

  if (loading) {
    return (
      <div className="px-4 py-2 text-xs text-lucina-muted">
        <span className="animate-pulse">Loading wiki...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full">
      {/* Wiki Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-lucina-secondary flex-shrink-0" />
          <span className="text-sm font-semibold text-lucina-primary truncate">Wiki</span>
        </div>
        <button
          onClick={() => handleAdd('topic')}
          className="p-1 hover:bg-lucina-secondary rounded transition-colors text-lucina-muted hover:text-lucina-primary flex-shrink-0"
          title="Add topic"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tree Items */}
      {topics.length === 0 ? (
        <div className="px-4 py-2 text-center">
          <p className="text-xs text-lucina-muted">No topics</p>
        </div>
      ) : (
        <div className="space-y-0.5 px-2">
          {topics.map((topic) => (
            <TreeNode
              key={topic.id}
              item={topic}
              type="topic"
              isExpanded={expandedNodes.has(topic.id)}
              expandedNodes={expandedNodes}
              onToggle={toggleNode}
              onAdd={handleAdd}
              level={0}
              activeItem={activeItemId}
              onSelect={onItemSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

