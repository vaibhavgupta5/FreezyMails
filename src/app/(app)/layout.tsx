import { getUser } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from './_components/Sidebar'
import Header from './_components/Header'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden skeu-page bg-surface-50 text-surface-900">
      <Sidebar user={user} />
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto flex flex-col relative">
        <Header />
        <main className="flex-1 relative">
          {children}
        </main>
      </div>
    </div>
  )
}
