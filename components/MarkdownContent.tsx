'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  if (!content.trim()) {
    return <p className="text-lucina-muted text-sm italic">Nothing to preview yet.</p>;
  }

  return (
    <div className={`markdown-content text-lucina-secondary text-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-lucina-primary mt-6 mb-3 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-lucina-primary mt-5 mb-2 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-lucina-primary mt-4 mb-2 first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="my-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-lucina-primary">{children}</strong>,
          em: ({ children }) => <em className="italic text-lucina-primary">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lucina-secondary hover:text-lucina-secondary hover:underline"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="my-2 list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal pl-5 space-y-1">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-4 border-lucina-rose pl-4 text-lucina-muted italic">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClassName, children }) => {
            const isBlock = codeClassName?.includes('language-');
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-lg bg-lucina-accent border border-lucina-rose p-3 text-xs font-mono text-lucina-primary">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-lucina-primary px-1.5 py-0.5 text-xs font-mono text-lucina-secondary">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-3 overflow-x-auto">{children}</pre>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="min-w-full border-collapse border border-lucina-rose text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-lucina-rose bg-lucina-white px-3 py-2 text-left font-semibold text-lucina-primary">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-lucina-rose px-3 py-2">{children}</td>
          ),
          hr: () => <hr className="my-4 border-lucina-rose" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}