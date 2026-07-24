'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Search, Trash2, Filter } from 'lucide-react'
import CampaignActions from './CampaignActions'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination'
import { toast } from 'sonner'

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
    lastSentAt: string | null
  }
}

export default function CampaignList({ initialCampaigns }: { initialCampaigns: CalculatedCampaign[] }) {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<CalculatedCampaign[]>(initialCampaigns)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage)
  const currentCampaigns = filteredCampaigns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(currentCampaigns.map(c => c.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds)
    if (checked) newSet.add(id)
    else newSet.delete(id)
    setSelectedIds(newSet)
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      })

      if (!res.ok) throw new Error('Failed to delete campaigns')

      setCampaigns(campaigns.filter(c => !selectedIds.has(c.id)))
      setSelectedIds(new Set())
      toast.success('Campaigns deleted successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete campaigns')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(dateString))
  }

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(new Date(dateString))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold font-display text-text-primary">Campaigns</h1>
        {campaigns.length > 0 && (
          <Link href="/campaigns/new">
            <Button variant="primary">New Campaign</Button>
          </Link>
        )}
      </div>

      {campaigns.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <div className="flex flex-1 gap-4 items-center w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <Input 
                type="text" 
                placeholder="Search campaigns..." 
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                className="skeu-input pl-10 h-10 w-full"
              />
            </div>
            
            <Select 
              value={statusFilter} 
              onValueChange={(val) => {
                setStatusFilter(val)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-40 h-10 skeu-select bg-bg-base border-none">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-text-muted" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="RUNNING">Running</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {selectedIds.size > 0 && (
            <Button 
              variant="outline" 
              className="border-danger-bg text-danger-text hover:bg-danger-bg hover:text-white transition-colors"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : (
                <>
                  <Trash2 size={16} className="mr-2" />
                  Delete Selected ({selectedIds.size})
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {campaigns.length === 0 ? (
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
          No campaigns found matching your filters.
        </div>
      ) : (
        <div className="skeu-card overflow-hidden">
          <Table>
            <TableHeader className="bg-bg-subtle border-b border-border-subtle">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center">
                  <Checkbox 
                    checked={currentCampaigns.length > 0 && selectedIds.size === currentCampaigns.length}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  />
                </TableHead>
                <TableHead className="font-semibold text-text-primary">Name</TableHead>
                <TableHead className="font-semibold text-text-primary">Status</TableHead>
                <TableHead className="font-semibold text-text-primary">Sent</TableHead>
                <TableHead className="font-semibold text-text-primary">Last Sent</TableHead>
                <TableHead className="font-semibold text-text-primary">Created</TableHead>
                <TableHead className="text-right font-semibold text-text-primary">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCampaigns.map(c => (
                <TableRow 
                  key={c.id} 
                  onClick={() => router.push(`/campaigns/${c.id}`)}
                  className="cursor-pointer hover:bg-bg-subtle/50 transition-colors group"
                >
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedIds.has(c.id)}
                      onCheckedChange={(checked) => handleSelectOne(c.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-text-primary">{c.name}</TableCell>
                  <TableCell><span className={`skeu-badge skeu-badge-${c.status.toLowerCase()}`}>{c.status}</span></TableCell>
                  <TableCell>{c.stats.sent}</TableCell>
                  <TableCell className="text-text-muted">
                    {c.stats.lastSentAt ? formatDateTime(c.stats.lastSentAt) : '-'}
                  </TableCell>
                  <TableCell className="text-text-muted">{formatDate(c.createdAt)}</TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <CampaignActions id={c.id} status={c.status} name={c.name} dailyLimit={c.dailyLimit} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="p-4 border-t border-border-subtle flex justify-between items-center">
              <div className="text-sm text-text-muted hidden sm:block">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCampaigns.length)} of {filteredCampaigns.length}
              </div>
              <Pagination className="w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    // Show first, last, current, and adjacent pages
                    if (
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink 
                            isActive={currentPage === page}
                            onClick={() => setCurrentPage(page)}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.max(1, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
