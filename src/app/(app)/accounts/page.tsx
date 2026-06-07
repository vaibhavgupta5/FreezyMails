import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import AccountForm from './_components/AccountForm'
import RefreshHealthButton from './_components/RefreshHealthButton'
import { Server } from 'lucide-react'

export default async function AccountsPage() {
  const user = await getUser()
  if (!user) return null

  const accounts = await prisma.emailAccount.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      label: true,
      fromEmail: true,
      smtpHost: true,
      healthScore: true,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Email Accounts</h1>
      </div>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Accounts</h2>
          {accounts.length === 0 ? (
            <div className="skeu-card text-center p-12 space-y-4">
              <Server className="mx-auto text-surface-400" size={48} />
              <p className="text-surface-600">No accounts added yet.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {accounts.map(acc => {
                let healthColor = 'text-green-600'
                if (acc.healthScore < 50) healthColor = 'text-red-600'
                else if (acc.healthScore <= 80) healthColor = 'text-amber-500'

                return (
                  <li key={acc.id} className="skeu-card flex flex-col space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{acc.label}</h3>
                        <p className="text-sm text-surface-600">{acc.fromEmail} &bull; {acc.smtpHost}</p>
                      </div>
                      <span className={`skeu-badge ${acc.isActive ? 'bg-ice-50 border-ice-200 text-ice-800' : 'bg-surface-100 border-surface-300 text-surface-600'}`}>
                        {acc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-surface-400 mt-2 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Health:</span>
                        <span className={`font-bold ${healthColor}`}>{acc.healthScore}/100</span>
                        {acc.healthScore === 0 && (
                          <span className="text-xs text-red-600 ml-2" title="Bounce rate too high. Review your recipient list.">(Paused - high bounce rate)</span>
                        )}
                      </div>
                      <RefreshHealthButton accountId={acc.id} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Add Account</h2>
          <div className="skeu-card">
            <AccountForm />
          </div>
        </div>
      </div>
    </div>
  )
}
