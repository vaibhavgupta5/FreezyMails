'use client'

import { useState } from 'react'
import { CampaignStatRow } from '@/types'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

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
    if (sortField !== field) return <ArrowUpDown size={14} className="text-surface-300 dark:text-surface-600" />
    return sortOrder === 'asc' 
      ? <ArrowUp size={14} className="text-ice-600" />
      : <ArrowDown size={14} className="text-ice-600" />
  }

  const thClass = "px-4 py-3 border-b border-surface-200 dark:border-surface-700 text-left text-sm font-semibold text-surface-700 dark:text-surface-300 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition select-none"

  const renderTh = (field: string, label: string) => (
    <th className={thClass} onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        {getSortIcon(field)}
      </div>
    </th>
  )

  return (
    <div className="overflow-x-auto rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm">
      <table className="w-full text-left border-collapse bg-white dark:bg-surface-900">
        <thead className="bg-surface-100 dark:bg-surface-800">
          <tr>
            {renderTh('name', 'Campaign Name')}
            {renderTh('sent', 'Sent')}
            {renderTh('opened', 'Opened')}
            {renderTh('openRate', 'Open %')}
            {renderTh('replied', 'Replied')}
            {renderTh('replyRate', 'Reply %')}
            {renderTh('failed', 'Failed')}
            {renderTh('createdAt', 'Date')}
          </tr>
        </thead>
        <tbody>
          {sortedData.map(row => (
            <tr key={row.id} className="hover:bg-surface-50 dark:hover:bg-surface-800 transition border-b border-surface-100 dark:border-surface-800 last:border-0">
              <td className="px-4 py-3 text-surface-900 dark:text-surface-50 font-medium">{row.name}</td>
              <td className="px-4 py-3 text-surface-700 dark:text-surface-300">{row.sent}</td>
              <td className="px-4 py-3 text-surface-700 dark:text-surface-300">{row.opened}</td>
              <td className="px-4 py-3 text-surface-700 dark:text-surface-300">{row.openRate.toFixed(1)}%</td>
              <td className="px-4 py-3 text-surface-700 dark:text-surface-300">{row.replied}</td>
              <td className="px-4 py-3 text-surface-700 dark:text-surface-300">{row.replyRate.toFixed(1)}%</td>
              <td className="px-4 py-3 text-red-600 font-medium">{row.failed}</td>
              <td className="px-4 py-3 text-sm text-surface-500 dark:text-surface-400">{new Date(row.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
