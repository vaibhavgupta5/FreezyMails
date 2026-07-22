import { getUser } from '@/lib/supabase'
import prisma from '@/lib/prisma'
import { User } from '@prisma/client'
import SettingsForm from './_components/SettingsForm'

export default async function SettingsPage() {
  const user = await getUser()
  if (!user) return null

  let dbUser = null;
  let accounts = [];

  try {
    dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    accounts = await prisma.emailAccount.findMany({ where: { userId: user.id } });
  } catch (error) {
    console.error("[Settings] DATABASE ERROR:", error);
    return (
      <div className="skeu-page p-8">
        <div className="max-w-2xl mx-auto p-8 mt-12 text-center text-red-500 bg-red-500/10 rounded-md border border-red-500/20">
          <h2 className="text-lg font-semibold mb-2">Database Connection Failed</h2>
          <p>We could not connect to the database to load your settings.</p>
          <p className="text-sm mt-2 opacity-80">This means your Supabase Connection Pooling URL is still failing. Check Vercel logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="skeu-page">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
        </div>
        <SettingsForm user={dbUser || { id: user.id, name: '', email: user.email || '', createdAt: new Date(), avatarUrl: null, defaultAccountId: null } as User} accounts={accounts} />
      </div>
    </div>
  )
}
