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
    <div className="flex skeu-page">
      <Sidebar user={user} />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto flex flex-col">
        <Header />
        <main className="flex-1 relative">
          {children}
        </main>
      </div>
    </div>
  )
}
