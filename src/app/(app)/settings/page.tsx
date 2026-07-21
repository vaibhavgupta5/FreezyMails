import { getUser } from '@/lib/supabase'
import prisma from '@/lib/prisma'
import SettingsForm from './_components/SettingsForm'

export default async function SettingsPage() {
  const user = await getUser()
  if (!user) return null

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })

  const accounts = await prisma.emailAccount.findMany({
    where: { userId: user.id }
  })

  return (
    <div className="skeu-page">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
        </div>
        <SettingsForm user={dbUser || { id: user.id, name: '', email: user.email || '', createdAt: new Date(), avatarUrl: null, defaultAccountId: null }} accounts={accounts} />
      </div>
    </div>
  )
}
