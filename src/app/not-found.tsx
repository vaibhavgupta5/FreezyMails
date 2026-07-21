import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-base opacity-10 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-md w-full bg-bg-subtle border border-border-subtle shadow-2xl rounded-2xl p-10 text-center space-y-8 relative overflow-hidden">
          <div className="space-y-4">
            <h1 className="text-8xl font-display font-black text-primary-base opacity-50 select-none">
              404
            </h1>
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-bold text-text-primary tracking-tight">Page not found</h2>
              <p className="text-text-muted text-sm leading-relaxed max-w-[280px] mx-auto">
                {"The page you are looking for doesn't exist or has been moved to another URL."}
              </p>
            </div>
          </div>
          
          <div className="pt-2 flex justify-center">
            <Link href="/dashboard" className="w-full">
              <Button variant="primary" className="w-full shadow-sm">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
