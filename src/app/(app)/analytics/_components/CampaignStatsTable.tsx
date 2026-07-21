'use client'

import { useState } from 'react'
import { CampaignStatRow } from '@/types'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function CampaignStatsTable({ data }: { data: CampaignStatRow[] }) {
 const [sortField, setSortField] = useState('createdAt')
 const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

 const sortedData = [...data].sort((a, b) => {
 if (a[sortField as keyof CampaignStatRow] < b[sortField as keyof CampaignStatRow]) return sortOrder === 'asc' ? -1 : 1
 if (a[sortField as keyof CampaignStatRow] > b[sortField as keyof CampaignStatRow]) return sortOrder === 'asc' ? 1 : -1
 return 0
 })

 const handleSort = (field: string) => {
 if (sortField === field) {
 setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
 } else {
 setSortField(field)
 setSortOrder('desc')
 }
 }

 const getSortIcon = (field: string) => {
 if (sortField !== field) return <ArrowUpDown size={14} className="text-text-muted dark:text-text-muted" />
 return sortOrder === 'asc' 
 ? <ArrowUp size={14} className="text-primary-base" />
 : <ArrowDown size={14} className="text-primary-base" />
 }

 const thClass = "cursor-pointer select-none font-semibold text-text-primary hover:bg-bg-subtle transition"

 const renderTh = (field: string, label: string) => (
 <TableHead className={thClass} onClick={() => handleSort(field)}>
 <div className="flex items-center gap-1">
 {label}
 {getSortIcon(field)}
 </div>
 </TableHead>
 )

 return (
 <div className="skeu-card overflow-hidden">
 <Table>
 <TableHeader className="bg-bg-subtle border-b border-border-subtle">
 <TableRow className="hover:bg-transparent">
 {renderTh('name', 'Campaign Name')}
 {renderTh('sent', 'Sent')}
 {renderTh('opened', 'Opened')}
 {renderTh('openRate', 'Open %')}
 {renderTh('replied', 'Replied')}
 {renderTh('replyRate', 'Reply %')}
 {renderTh('failed', 'Failed')}
 {renderTh('createdAt', 'Date')}
 </TableRow>
 </TableHeader>
 <TableBody>
 {sortedData.map(row => (
 <TableRow key={row.id}>
 <TableCell className="font-medium text-text-primary">{row.name}</TableCell>
 <TableCell>{row.sent}</TableCell>
 <TableCell>{row.opened}</TableCell>
 <TableCell>{row.openRate.toFixed(1)}%</TableCell>
 <TableCell>{row.replied}</TableCell>
 <TableCell>{row.replyRate.toFixed(1)}%</TableCell>
 <TableCell className="text-danger-text font-medium">{row.failed}</TableCell>
 <TableCell className="text-text-muted">{new Date(row.createdAt).toLocaleDateString()}</TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )
}
