'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Search } from 'lucide-react'
import CampaignActions from './CampaignActions'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface CalculatedCampaign {
  id: string
  name: string
  status: string
  dailyLimit?: number | null
  createdAt: string
  stats: {
    sent: number
    opens: number
    replies: number
  }
}

export default function CampaignList({ initialCampaigns }: { initialCampaigns: CalculatedCampaign[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filteredCampaigns = initialCampaigns.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const formatPercentage = (count: number, total: number) => {
    if (total === 0) return '-'
    return `${Math.round((count / total) * 100)}%`
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(dateString))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold font-display text-text-primary">Campaigns</h1>
        {initialCampaigns.length > 0 && (
          <Link href="/campaigns/new">
            <Button variant="primary">New Campaign</Button>
          </Link>
        )}
      </div>

      {initialCampaigns.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <Input 
            type="text" 
            placeholder="Search campaigns..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="skeu-input pl-10"
          />
        </div>
      )}

      {initialCampaigns.length === 0 ? (
        <div className="skeu-card flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
          <Mail size={64} className="text-text-muted opacity-50" />
          <div>
            <h3 className="text-lg font-semibold text-text-primary">No campaigns yet</h3>
            <p className="text-text-muted mt-1">Create your first campaign to start sending cold emails.</p>
          </div>
          <Link href="/campaigns/new">
            <Button variant="primary" className="mt-4">Create Campaign</Button>
          </Link>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="skeu-card p-12 text-center text-text-muted">
          No campaigns found matching "{search}"
        </div>
      ) : (
        <div className="skeu-card overflow-hidden">
          <Table>
            <TableHeader className="bg-bg-subtle border-b border-border-subtle">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-text-primary">Name</TableHead>
                <TableHead className="font-semibold text-text-primary">Status</TableHead>
                <TableHead className="font-semibold text-text-primary">Sent</TableHead>
                <TableHead className="font-semibold text-text-primary">Opens</TableHead>
                <TableHead className="font-semibold text-text-primary">Replies</TableHead>
                <TableHead className="font-semibold text-text-primary">Created</TableHead>
                <TableHead className="text-right font-semibold text-text-primary">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map(c => (
                <TableRow 
                  key={c.id} 
                  onClick={() => router.push(`/campaigns/${c.id}`)}
                  className="cursor-pointer hover:bg-bg-subtle/50 transition-colors group"
                >
                  <TableCell className="font-medium text-text-primary">{c.name}</TableCell>
                  <TableCell><span className={`skeu-badge skeu-badge-${c.status.toLowerCase()}`}>{c.status}</span></TableCell>
                  <TableCell>{c.stats.sent}</TableCell>
                  <TableCell>
                    {c.stats.opens} <span className="text-xs text-text-muted ml-1">({formatPercentage(c.stats.opens, c.stats.sent)})</span>
                  </TableCell>
                  <TableCell>
                    {c.stats.replies} <span className="text-xs text-text-muted ml-1">({formatPercentage(c.stats.replies, c.stats.sent)})</span>
                  </TableCell>
                  <TableCell className="text-text-muted">{formatDate(c.createdAt)}</TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <CampaignActions id={c.id} status={c.status} name={c.name} dailyLimit={c.dailyLimit} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
