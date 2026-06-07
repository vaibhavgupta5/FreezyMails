import Link from 'next/link'
import { HelpCircle, ArrowLeft, Snowflake } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-200 relative overflow-hidden">
      {/* Navbar */}
      <nav className="relative z-20 flex justify-between items-center px-8 py-6 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Snowflake className="text-ice-500 shrink-0" size={32} />
          <span className="text-2xl font-medium text-surface-900 drop-shadow-sm truncate">
            freezy<span className="text-ice-900 font-bold">Mails</span>
          </span>
        </div>
        <div className="flex gap-4">
          <Link href="/" className="skeu-btn-ghost font-medium">
            Back to Home
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        {/* Decorative background elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-ice-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-ice-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="relative z-10 max-w-lg w-full">
        <div className="skeu-card p-12 text-center flex flex-col items-center border border-surface-300 backdrop-blur-sm bg-surface-50/80 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1),_0_0_0_1px_rgba(255,255,255,0.8)] rounded-3xl">
          
         
          
          <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-ice-600 to-ice-900 mb-2 drop-shadow-sm">
            404
          </h1>
          
          <h2 className="text-2xl font-bold text-surface-900 mb-4 tracking-tight">
            Lost in the cold?
          </h2>
          
          <p className="text-surface-600 mb-8 leading-relaxed max-w-xs mx-auto">
            {"We couldn't find the page you're looking for. It might have been moved, deleted, or perhaps never existed."}
          </p>
          
          <Link 
            href="/dashboard" 
            className="group flex items-center justify-center gap-2 skeu-btn-primary w-full py-3 px-6 text-lg rounded-xl hover:shadow-[0_8px_20px_-6px_rgba(34,136,204,0.4)] transition-all duration-300 transform hover:-translate-y-1"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          
          <div className="mt-8 pt-6 border-t border-surface-300/50 w-full">
            <p className="text-xs text-surface-500 font-medium">FreezyMails</p>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
