import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
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
            <h1 className="text-4xl font-display font-bold text-text-primary tracking-tight">Page not found</h1>
            <p className="text-text-muted text-base leading-relaxed">
              {"The page you are looking for doesn't exist or has been moved."}
            </p>
          </div>
          
          <div className="pt-4 flex justify-center">
            <Link href="/dashboard">
              <Button variant="primary" className="px-8">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
