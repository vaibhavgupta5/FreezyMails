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
    <div className="dark min-h-[100dvh] flex flex-col bg-bg-base text-text-primary font-sans">
      <header className="h-16 flex items-center justify-between border-b border-border-subtle px-6 bg-bg-base sticky top-0 z-50">
        <Logo 
          iconSize={24} 
          textSize="text-xl" 
          textColor="text-text-primary" 
        />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-danger-bg rounded-full blur-3xl -z-10" />

        <div className="max-w-md w-full bg-bg-subtle border border-border-subtle shadow-2xl rounded-2xl p-10 text-center space-y-8 relative overflow-hidden">
          <div className="space-y-4">
            <h1 className="text-8xl font-display font-black text-danger-text opacity-50 select-none">
              500
            </h1>
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-bold text-text-primary tracking-tight">Something went wrong</h2>
              <p className="text-text-muted text-sm leading-relaxed max-w-[300px] mx-auto text-wrap break-words">
                {error.message?.substring(0, 100) || "An unexpected error occurred while loading this page. Our team has been notified."}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button 
              variant="primary"
              onClick={() => reset()}
              className="w-full sm:w-auto flex-1 shadow-sm"
            >
              Try again
            </Button>
            <Link href="/dashboard" className="w-full sm:w-auto flex-1">
              <Button variant="ghost" className="w-full">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

