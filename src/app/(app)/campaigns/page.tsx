import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import CampaignActions from './_components/CampaignActions'

export default async function CampaignsPage() {
  const user = await getUser()
  if (!user) return null

  const campaigns = await prisma.campaign.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Link href="/campaigns/new" className="skeu-btn-primary">New Campaign</Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="skeu-card flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
          <Mail size={64} className="text-surface-300" />
          <div>
            <h3 className="text-lg font-semibold text-surface-900">No campaigns yet</h3>
            <p className="text-surface-600 mt-1">Create your first campaign to start sending cold emails.</p>
          </div>
          <Link href="/campaigns/new" className="skeu-btn-primary mt-4">Create Campaign</Link>
        </div>
      ) : (
        <div className="skeu-card">
          <table className="skeu-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id}>
                  <td><Link href={`/campaigns/${c.id}`} className="hover:underline font-medium">{c.name}</Link></td>
                  <td><span className={`skeu-badge skeu-badge-${c.status.toLowerCase()}`}>{c.status}</span></td>
                  <td>{c.createdAt.toLocaleDateString()}</td>
                  <td className="text-right">
                    <CampaignActions id={c.id} status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
