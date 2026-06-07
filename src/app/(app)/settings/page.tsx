import { getUser } from '@/lib/supabase'
import prisma from '@/lib/prisma'
import SettingsForm from './_components/SettingsForm'

export default async function SettingsPage() {
  const user = await getUser()
  if (!user) return null

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })

  const accounts = await prisma.emailAccount.findMany({
    where: { userId: user.id },
    select: { id: true, label: true }
  })

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsForm user={dbUser || { id: user.id, name: '', email: user.email, defaultAccountId: null }} accounts={accounts} />
    </div>
  )
}
