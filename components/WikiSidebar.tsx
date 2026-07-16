'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronRight, Plus, BookOpen, Folder, FileText, GripVertical, Trash2 } from 'lucide-react'

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

type NodeType = 'topic' | 'subject' | 'content'

interface DragData {
  type: NodeType
  parentId?: string
}

interface TreeNodeProps {
  item: Topic | Subject | ContentItem
  type: NodeType
  parentId?: string
  topicSlug?: string
  isExpanded: boolean
  expandedNodes: Set<string>
  onToggle: (id: string) => void
  onAdd: (type: NodeType, parentId?: string) => void
  onDelete: (id: string, type: NodeType, title: string) => void
  level: number
  activeItem?: string
  onSelect?: (id: string, type: NodeType) => void
}

function TreeNode({
  item,
  type,
  parentId,
  topicSlug,
  isExpanded,
  expandedNodes,
  onToggle,
  onAdd,
  onDelete,
  level,
  activeItem,
  onSelect,
}: TreeNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { type, parentId } satisfies DragData,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

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

  const subjectIds = useMemo(
    () => (type === 'topic' ? ((item as Topic).subjects ?? []).map((s) => s.id) : []),
    [type, item]
  )
  const contentIds = useMemo(
    () => (type === 'subject' ? ((item as Subject).contentItems ?? []).map((c) => c.id) : []),
    [type, item]
  )

  return (
    <div ref={setNodeRef} style={style} className="select-none">
      {/* Node Container */}
      <div className="flex items-center gap-0.5 group" style={{ paddingLeft: `${paddingLeft}px` }}>
        {/* Drag Handle (appears on hover) */}
        <button
          type="button"
          className="p-0.5 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing touch-none rounded text-lucina-muted hover:text-lucina-secondary flex-shrink-0 transition-opacity"
          aria-label={`Drag ${getDisplayTitle()}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-3 h-3" />
        </button>

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

        {/* Delete Button (appears on hover) */}
        <button
          onClick={() => onDelete(item.id, type, getDisplayTitle())}
          className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-all text-lucina-muted hover:text-red-600 flex-shrink-0"
          title={`Delete ${type}`}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="space-y-0">
          {type === 'topic' && (
            <SortableContext items={subjectIds} strategy={verticalListSortingStrategy}>
              {(item as Topic).subjects?.map((subject) => (
                <TreeNode
                  key={subject.id}
                  item={subject}
                  type="subject"
                  parentId={item.id}
                  topicSlug={(item as Topic).slug}
                  isExpanded={expandedNodes.has(subject.id)}
                  expandedNodes={expandedNodes}
                  onToggle={onToggle}
                  onAdd={onAdd}
                  onDelete={onDelete}
                  level={level + 1}
                  activeItem={activeItem}
                  onSelect={onSelect}
                />
              ))}
            </SortableContext>
          )}
          {type === 'subject' && (
            <SortableContext items={contentIds} strategy={verticalListSortingStrategy}>
              {(item as Subject).contentItems?.map((content) => (
                <TreeNode
                  key={content.id}
                  item={content}
                  type="content"
                  parentId={item.id}
                  topicSlug={topicSlug}
                  isExpanded={false}
                  expandedNodes={expandedNodes}
                  onToggle={onToggle}
                  onAdd={onAdd}
                  onDelete={onDelete}
                  level={level + 1}
                  activeItem={activeItem}
                  onSelect={onSelect}
                />
              ))}
            </SortableContext>
          )}
        </div>
      )}
    </div>
  )
}

interface WikiSidebarProps {
  onItemSelect?: (id: string, type: NodeType) => void
  activeItemId?: string
}

export function WikiSidebar({ onItemSelect, activeItemId }: WikiSidebarProps) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [reorderError, setReorderError] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

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

  const handleAdd = useCallback((type: NodeType, parentId?: string) => {
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

  const handleDelete = useCallback(async (id: string, type: NodeType, title: string) => {
    const warning = {
      topic: `Delete topic "${title}" and ALL its subjects and content? This cannot be undone.`,
      subject: `Delete subject "${title}" and all its content? This cannot be undone.`,
      content: `Delete "${title}"? This cannot be undone.`,
    }[type]
    if (!window.confirm(warning)) return

    setReorderError('')
    try {
      const response = await fetch(`/api/wiki/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Failed to delete ${type}`)
      }
      await loadTopics()
    } catch (error) {
      console.error(error)
      setReorderError(error instanceof Error ? error.message : `Failed to delete ${type}`)
    }
  }, [])

  const persist = useCallback(
    async (
      payload: {
        topics?: { id: string; order: number }[]
        subjects?: { id: string; order: number; topicId?: string }[]
        contentItems?: { id: string; order: number; subjectId?: string }[]
      },
      reloadAfter: boolean
    ) => {
      setReorderError('')
      try {
        const response = await fetch('/api/wiki/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to save order')
        }
        // Cross-parent moves can change slugs server-side — refresh the tree.
        if (reloadAfter) await loadTopics()
      } catch (error) {
        console.error(error)
        setReorderError(error instanceof Error ? error.message : 'Failed to save order')
        await loadTopics()
      }
    },
    []
  )

  // Locate a subject / content item anywhere in the tree.
  const findSubject = (id: string) => {
    for (const topic of topics) {
      const idx = (topic.subjects ?? []).findIndex((s) => s.id === id)
      if (idx >= 0) return { topic, index: idx, subject: topic.subjects![idx] }
    }
    return null
  }
  const findContent = (id: string) => {
    for (const topic of topics) {
      for (const subject of topic.subjects ?? []) {
        const idx = (subject.contentItems ?? []).findIndex((c) => c.id === id)
        if (idx >= 0) return { topic, subject, index: idx, content: subject.contentItems![idx] }
      }
    }
    return null
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeData = active.data.current as DragData | undefined
    const overData = over.data.current as DragData | undefined
    if (!activeData || !overData) return

    // --- Topic reorder ---
    if (activeData.type === 'topic') {
      // Resolve whatever we dropped on to its containing topic.
      let overTopicId = String(over.id)
      if (overData.type === 'subject') {
        overTopicId = findSubject(String(over.id))?.topic.id ?? overTopicId
      } else if (overData.type === 'content') {
        overTopicId = findContent(String(over.id))?.topic.id ?? overTopicId
      }
      const oldIndex = topics.findIndex((t) => t.id === active.id)
      const newIndex = topics.findIndex((t) => t.id === overTopicId)
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return

      const next = arrayMove(topics, oldIndex, newIndex).map((t, i) => ({ ...t, order: i + 1 }))
      setTopics(next)
      void persist({ topics: next.map((t) => ({ id: t.id, order: t.order })) }, false)
      return
    }

    // --- Subject reorder / move between topics ---
    if (activeData.type === 'subject') {
      const source = findSubject(String(active.id))
      if (!source) return

      // Resolve drop target to a topic + insertion index.
      let targetTopic: Topic | undefined
      let targetIndex: number
      if (overData.type === 'topic') {
        targetTopic = topics.find((t) => t.id === over.id)
        targetIndex = targetTopic?.subjects?.length ?? 0
        if (targetTopic?.id === source.topic.id) return // dropped on own topic header
      } else if (overData.type === 'subject') {
        const target = findSubject(String(over.id))
        if (!target) return
        targetTopic = target.topic
        targetIndex = target.index
      } else {
        const target = findContent(String(over.id))
        if (!target) return
        targetTopic = target.topic
        targetIndex = (target.topic.subjects ?? []).findIndex((s) => s.id === target.subject.id)
      }
      if (!targetTopic) return

      if (targetTopic.id === source.topic.id) {
        // Same-topic reorder
        const nextSubjects = arrayMove(source.topic.subjects ?? [], source.index, targetIndex).map(
          (s, i) => ({ ...s, order: i + 1 })
        )
        setTopics((prev) =>
          prev.map((t) => (t.id === source.topic.id ? { ...t, subjects: nextSubjects } : t))
        )
        void persist(
          { subjects: nextSubjects.map((s) => ({ id: s.id, order: s.order })) },
          false
        )
      } else {
        // Move to another topic
        const sourceSubjects = (source.topic.subjects ?? [])
          .filter((s) => s.id !== source.subject.id)
          .map((s, i) => ({ ...s, order: i + 1 }))
        const targetSubjects = [...(targetTopic.subjects ?? [])]
        targetSubjects.splice(targetIndex, 0, source.subject)
        const renumberedTarget = targetSubjects.map((s, i) => ({ ...s, order: i + 1 }))

        setTopics((prev) =>
          prev.map((t) => {
            if (t.id === source.topic.id) return { ...t, subjects: sourceSubjects }
            if (t.id === targetTopic!.id) return { ...t, subjects: renumberedTarget }
            return t
          })
        )
        void persist(
          {
            subjects: [
              ...sourceSubjects.map((s) => ({ id: s.id, order: s.order })),
              ...renumberedTarget.map((s) => ({
                id: s.id,
                order: s.order,
                ...(s.id === source.subject.id ? { topicId: targetTopic!.id } : {}),
              })),
            ],
          },
          true
        )
      }
      return
    }

    // --- Content item reorder / move between subjects ---
    if (activeData.type === 'content') {
      const source = findContent(String(active.id))
      if (!source) return

      let targetSubject: Subject | undefined
      let targetIndex: number
      if (overData.type === 'subject') {
        targetSubject = findSubject(String(over.id))?.subject
        targetIndex = targetSubject?.contentItems?.length ?? 0
        if (targetSubject?.id === source.subject.id) return
      } else if (overData.type === 'content') {
        const target = findContent(String(over.id))
        if (!target) return
        targetSubject = target.subject
        targetIndex = target.index
      } else {
        return // dropping a content item on a topic is ambiguous — ignore
      }
      if (!targetSubject) return

      if (targetSubject.id === source.subject.id) {
        const nextItems = arrayMove(source.subject.contentItems ?? [], source.index, targetIndex).map(
          (c, i) => ({ ...c, order: i + 1 })
        )
        setTopics((prev) =>
          prev.map((t) => ({
            ...t,
            subjects: t.subjects?.map((s) =>
              s.id === source.subject.id ? { ...s, contentItems: nextItems } : s
            ),
          }))
        )
        void persist(
          { contentItems: nextItems.map((c) => ({ id: c.id, order: c.order })) },
          false
        )
      } else {
        const sourceItems = (source.subject.contentItems ?? [])
          .filter((c) => c.id !== source.content.id)
          .map((c, i) => ({ ...c, order: i + 1 }))
        const targetItems = [...(targetSubject.contentItems ?? [])]
        targetItems.splice(targetIndex, 0, source.content)
        const renumberedTarget = targetItems.map((c, i) => ({ ...c, order: i + 1 }))

        setTopics((prev) =>
          prev.map((t) => ({
            ...t,
            subjects: t.subjects?.map((s) => {
              if (s.id === source.subject.id) return { ...s, contentItems: sourceItems }
              if (s.id === targetSubject!.id) return { ...s, contentItems: renumberedTarget }
              return s
            }),
          }))
        )
        void persist(
          {
            contentItems: [
              ...sourceItems.map((c) => ({ id: c.id, order: c.order })),
              ...renumberedTarget.map((c) => ({
                id: c.id,
                order: c.order,
                ...(c.id === source.content.id ? { subjectId: targetSubject!.id } : {}),
              })),
            ],
          },
          false
        )
      }
    }
  }

  const topicIds = useMemo(() => topics.map((t) => t.id), [topics])

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

      {reorderError && (
        <div className="mx-2 mb-2 p-2 rounded-lg border border-red-300 bg-red-50 text-red-700 text-xs">
          {reorderError}
        </div>
      )}

      {/* Tree Items */}
      {topics.length === 0 ? (
        <div className="px-4 py-2 text-center">
          <p className="text-xs text-lucina-muted">No topics</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={topicIds} strategy={verticalListSortingStrategy}>
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
                  onDelete={handleDelete}
                  level={0}
                  activeItem={activeItemId}
                  onSelect={onItemSelect}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
