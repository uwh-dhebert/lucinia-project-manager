'use client';

import dynamic from 'next/dynamic';

const MarkdownContent = dynamic(
  () => import('@/components/MarkdownContent').then((mod) => mod.MarkdownContent),
  {
    ssr: false,
    loading: () => <p className="text-lucina-muted text-sm animate-pulse">Rendering markdown...</p>,
  }
);

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return <MarkdownContent content={content} className={className} />;
}