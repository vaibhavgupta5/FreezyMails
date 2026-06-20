'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/button'

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[100dvh] flex flex-col bg-bg-subtle text-text-primary font-sans">
      <header className="h-16 flex items-center border-b border-surface-400 px-6 bg-surface-100 dark:bg-surface-800">
        <Logo 
          iconSize={24} 
          textSize="text-xl" 
          textColor="text-surface-900" 
        />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-display font-bold text-text-primary tracking-tight">Something went wrong</h1>
            <p className="text-text-muted text-base text-wrap wrap-break-word">
              {error.message.substring(0,100) || "An unexpected error occurred while loading this page. Our team has been notified."}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button 
              variant="primary"
              onClick={() => reset()}
              className="w-full sm:w-auto px-8"
            >
              Try again
            </Button>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full px-8">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
