'use client'

import { createClientBrowser } from '@/lib/supabase-client'
import {  Snowflake } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      const supabase = createClientBrowser()
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
        },
      })
    } catch (error) {
      console.error(error)
      setLoading(false)
    }
  }

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

      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-ice-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-ice-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-surface-100 rounded-full mix-blend-overlay filter blur-[80px] opacity-50"></div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
        <div className="skeu-card p-10 flex flex-col items-center border border-surface-300 backdrop-blur-md bg-surface-50/80 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1),_0_0_0_1px_rgba(255,255,255,0.8)] rounded-3xl">
          
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-ice-50 to-ice-200 shadow-skeu-raised flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-ice-300/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <Snowflake size={40} className="text-ice-600 drop-shadow-sm group-hover:rotate-180 transition-transform duration-700 ease-in-out" />
          </div>
          
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-surface-800 to-surface-600 mb-2 tracking-tight text-center">
            FreezyMails
          </h2>
          
          <p className="text-surface-500 mb-8 text-center text-sm">
            Cold outreach that actually gets warm replies.
          </p>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full relative group overflow-hidden rounded-xl bg-white shadow-skeu-raised border border-surface-200 hover:border-ice-300 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-ice-50 to-surface-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center gap-3 py-3.5 px-4">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="font-semibold text-surface-800">
                {loading ? 'Connecting...' : 'Continue with Google'}
              </span>
            </div>
          </button>
          
          <div className="mt-8 pt-6 border-t border-surface-200 w-full text-center">
            <p className="text-xs text-surface-400">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
