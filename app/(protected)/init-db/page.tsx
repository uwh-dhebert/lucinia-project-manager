'use client'

import { useEffect, useState } from 'react'

export default function InitDbPage() {
  const [status, setStatus] = useState<'checking' | 'ready' | 'error' | 'initializing'>('checking')
  const [message, setMessage] = useState('')

  useEffect(() => {
    checkDatabase()
  }, [])

  const checkDatabase = async () => {
    try {
      const response = await fetch('/api/init-db')
      const data = await response.json()

      if (data.initialized) {
        setStatus('ready')
        setMessage('✅ Database is ready! Redirecting...')
        setTimeout(() => {
          window.location.href = '/projects'
        }, 2000)
      } else {
        setStatus('error')
        setMessage(data.message || 'Database not initialized')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Failed to check database status')
    }
  }

  const initializeDatabase = async () => {
    setStatus('initializing')
    setMessage('Initializing database...')

    try {
      const response = await fetch('/api/init-db', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        setStatus('ready')
        setMessage('✅ Database initialized! Redirecting...')
        setTimeout(() => {
          window.location.href = '/projects'
        }, 2000)
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to initialize database')
      }
    } catch (error: any) {
      setStatus('error')
      setMessage(error.message || 'Failed to initialize database')
    }
  }

  return (
    <div className="min-h-screen bg-lucina-accent flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <img src="/lucina-logo.svg" alt="Lucina" width={160} height={48} />
          </div>
          <h1 className="text-2xl font-serif font-bold text-lucina-primary">Database Setup</h1>
          <p className="text-lucina-muted mt-2">Initialize your database to get started</p>
        </div>

        {/* Status Card */}
        <div className="bg-lucina-white border border-lucina-rose rounded-2xl p-8 mb-8">
          {status === 'checking' && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lucina-secondary mb-4"></div>
              <p className="text-lucina-secondary">Checking database status...</p>
            </div>
          )}

          {status === 'initializing' && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lucina-secondary mb-4"></div>
              <p className="text-lucina-secondary">Initializing database...</p>
              <p className="text-lucina-muted text-sm mt-2">This may take a moment...</p>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="text-center mb-6">
                <p className="text-red-600 mb-4">{message}</p>
              </div>

              <div className="space-y-6">
                {/* Option 1 */}
                <div className="border border-lucina-rose rounded-xl p-6 bg-lucina-surface">
                  <h3 className="text-lg font-semibold text-lucina-primary mb-2">Option 1: Initialize Here</h3>
                  <p className="text-lucina-muted text-sm mb-4">
                    Click the button below to attempt automatic initialization (requires network access to Supabase).
                  </p>
                  <button
                    onClick={initializeDatabase}
                    className="w-full px-4 py-2.5 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors"
                  >
                    Initialize Database
                  </button>
                </div>

                {/* Option 2 */}
                <div className="border border-lucina-secondary rounded-xl p-6 bg-lucina-surface">
                  <h3 className="text-lg font-semibold text-lucina-primary mb-2">Option 2: Use Supabase Dashboard</h3>
                  <p className="text-lucina-muted text-sm mb-4">
                    Use Supabase SQL Editor to run the database setup script manually.
                  </p>
                  <div className="space-y-2 text-sm text-lucina-muted mb-4">
                    <p>1. Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-lucina-secondary hover:underline">Supabase Dashboard</a></p>
                    <p>2. Select your project</p>
                    <p>3. Open SQL Editor → New Query</p>
                    <p>4. Copy all content from <code className="bg-lucina-primary px-2 py-1 rounded">DATABASE_SETUP.sql</code></p>
                    <p>5. Paste and click Run</p>
                  </div>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full px-4 py-2.5 bg-lucina-rose text-lucina-primary font-medium rounded-full hover:bg-lucina-rose-hover transition-colors text-center"
                  >
                    Open Supabase Dashboard
                  </a>
                </div>

                {/* Option 3 */}
                <div className="border border-green-700 rounded-xl p-6 bg-green-900/30">
                  <h3 className="text-lg font-semibold text-lucina-primary mb-2">Option 3: Use Terminal (Advanced)</h3>
                  <p className="text-lucina-muted text-sm mb-4">
                    Run this command in your terminal to initialize the database:
                  </p>
                  <div className="bg-lucina-primary p-3 rounded-lg mb-4 overflow-x-auto">
                    <code className="text-sm text-lucina-primary whitespace-nowrap">
                      bun run scripts/init-db.ts
                    </code>
                  </div>
                  <p className="text-lucina-muted text-xs">Requires psql to be installed</p>
                </div>
              </div>
            </div>
          )}

          {status === 'ready' && (
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-emerald-600 text-lg font-semibold mb-2">{message}</p>
              <p className="text-lucina-muted">You will be redirected shortly...</p>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="bg-lucina-white/50 border border-lucina-rose rounded-xl p-6">
          <h3 className="text-sm font-semibold text-lucina-secondary mb-3">❓ What is happening?</h3>
          <p className="text-lucina-muted text-sm leading-relaxed">
            Your Lucina app needs to create database tables in Supabase. Choose any of the three options above to initialize your database. Once complete, you'll be able to create projects and use all features!
          </p>
        </div>
      </div>
    </div>
  )
}

