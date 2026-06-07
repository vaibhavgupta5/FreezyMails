'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Snowflake } from 'lucide-react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

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
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="relative z-10 max-w-lg w-full">
          <div className="skeu-card p-12 text-center flex flex-col items-center border border-surface-300 backdrop-blur-sm bg-surface-50/80 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1),_0_0_0_1px_rgba(255,255,255,0.8)] rounded-3xl">
            
            <div className="w-24 h-24 mb-6 rounded-2xl bg-gradient-to-br from-red-100 to-red-200 shadow-skeu-raised flex items-center justify-center transform -rotate-6 hover:rotate-0 transition-transform duration-300">
              <AlertTriangle size={48} className="text-red-600" />
            </div>
            
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800 mb-2 drop-shadow-sm tracking-tight">
              Error
            </h1>
            
            <h2 className="text-2xl font-bold text-surface-900 mb-4 tracking-tight">
              Something went wrong!
            </h2>
            
            <p className="text-surface-600 mb-8 leading-relaxed max-w-xs mx-auto">
              {error.message || 'An unexpected error occurred while loading this page.'}
            </p>
            
            <button 
              onClick={() => reset()}
              className="group flex items-center justify-center gap-2 bg-gradient-to-br from-surface-100 to-surface-200 border border-surface-300 text-surface-900 font-medium w-full py-3 px-6 text-lg rounded-xl shadow-skeu-raised hover:shadow-skeu-raised-hover hover:-translate-y-0.5 active:translate-y-0 active:shadow-skeu-inset transition-all duration-300"
            >
              <RotateCcw size={20} className="group-hover:-rotate-90 transition-transform duration-300" />
              Try again
            </button>
            
            <div className="mt-8 pt-6 border-t border-surface-300/50 w-full">
              <p className="text-xs text-surface-500 font-medium">FreezyMails</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
