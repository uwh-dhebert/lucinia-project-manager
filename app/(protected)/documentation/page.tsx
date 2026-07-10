'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DocumentationPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to wiki
    router.push('/wiki');
  }, [router]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-lucina-primary">Documentation</h1>
          <p className="text-lucina-muted mt-2">Redirecting to Wiki...</p>
        </div>
      </div>

      <div className="border-2 border-dashed border-lucina-rose rounded-2xl p-12 text-center">
        <div className="text-5xl mb-4">📖</div>
        <h2 className="text-2xl font-bold text-lucina-primary mb-2">Documentation Moved</h2>
        <p className="text-lucina-muted mb-6">Documentation has been moved to the Wiki for better organization.</p>
        <Link
          href="/wiki"
          className="inline-block px-6 py-3 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors shadow-lg hover:shadow-xl"
        >
          Go to Wiki
        </Link>
      </div>
    </div>
  );
}

