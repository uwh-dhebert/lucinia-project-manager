'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface QuickStats {
  projects: number;
  documents: number;
  links: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<QuickStats>({ projects: 0, documents: 0, links: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, []);

  const features = [
    {
      href: '/projects',
      icon: '📋',
      title: 'Projects',
      description: 'Manage your projects and organize your work',
    },
    {
      href: '/wiki',
      icon: '📖',
      title: 'Wiki',
      description: 'Standalone documentation and knowledge base',
    },
    {
      href: '/links',
      icon: '🔗',
      title: 'Links',
      description: 'Bookmark and organize your favorite URLs',
    },
    {
      href: '/chat',
      icon: '💬',
      title: 'Chat',
      description: 'Chat with Grok AI about your projects',
    },
    {
      href: '/ai-tools',
      icon: '✨',
      title: 'AI Tools',
      description: 'Generate design documents and get recommendations',
    },
  ];

  return (
    <div className="space-y-12">
      <div className="space-y-2">
        <h1 className="text-5xl font-serif font-bold text-lucina-primary">Welcome back</h1>
        <p className="text-xl text-lucina-secondary">Let&apos;s build something amazing today</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Projects', value: statsLoading ? '—' : stats.projects, icon: '📋' },
          { label: 'Documents', value: statsLoading ? '—' : stats.documents, icon: '📄' },
          { label: 'Links', value: statsLoading ? '—' : stats.links, icon: '🔗' },
        ].map((stat, i) => (
          <div
            key={i}
            className="lucina-card border border-lucina-rose rounded-2xl p-8 hover:border-lucina-secondary transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lucina-muted text-sm font-medium uppercase tracking-wide">{stat.label}</p>
                <p className="text-4xl font-serif font-bold text-lucina-secondary mt-1">{stat.value}</p>
              </div>
              <div className="text-4xl opacity-50">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-2xl font-serif font-bold text-lucina-primary mb-6">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {features.map((feature, i) => (
            <Link
              key={i}
              href={feature.href}
              className="group relative overflow-hidden rounded-2xl p-6 border border-lucina-rose transition-all hover:shadow-xl hover:-translate-y-1 bg-lucina-white hover:border-lucina-secondary"
            >
              <div className="relative z-10">
                <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="font-bold text-lucina-primary text-sm">{feature.title}</h3>
                <p className="text-lucina-muted text-xs mt-2 line-clamp-2">{feature.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-lucina-secondary p-12 text-lucina-cream">
        <div className="relative z-10 max-w-lg">
          <h2 className="text-3xl font-serif font-bold mb-3">Get started in seconds</h2>
          <p className="text-lucina-cream/90 mb-6">Create your first project and start organizing your work with Lucina.</p>
          <Link
            href="/projects"
            className="inline-block px-8 py-3 bg-lucina-rose text-lucina-primary font-bold rounded-xl border-2 border-lucina-dark shadow-[0_6px_0_0_#28121C] hover:bg-lucina-rose-hover transition-all hover:scale-105"
          >
            Create a Project
          </Link>
        </div>
        <div className="absolute right-0 top-0 text-8xl opacity-10">📋</div>
      </div>
    </div>
  );
}