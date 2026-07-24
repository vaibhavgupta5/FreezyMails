import { getUser } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from './_components/Sidebar'
import Header from './_components/Header'
import QueryProvider from '@/providers/QueryProvider'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
 const user = await getUser()
 if (!user) {
 redirect('/login')
 }

 return (
 <div className="flex h-[100dvh] overflow-hidden skeu-page bg-bg-base text-text-primary">
    {/* Global Noise Overlay */}
    <div
      className="fixed inset-0 z-[100] pointer-events-none opacity-[0.015] transform-gpu"
      style={{
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
      }}
    ></div>
    
 <Sidebar user={user} />
 
 {/* Main Content */}
 <QueryProvider>
 <div className="flex-1 overflow-y-auto flex flex-col relative">
 <Header />
 <main className="flex-1 relative">
 {children}
 </main>
 </div>
 </QueryProvider>
 </div>
 )
}
