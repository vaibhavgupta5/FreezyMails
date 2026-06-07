'use client'

import { useState } from 'react'

export default function CampaignStatsTable({ data }: { data: any[] }) {
  const [sortField, setSortField] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const sortedData = [...data].sort((a, b) => {
    if (a[sortField] < b[sortField]) return sortOrder === 'asc' ? -1 : 1
    if (a[sortField] > b[sortField]) return sortOrder === 'asc' ? 1 : -1
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

  const thClass = "px-4 py-3 border-b text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className={thClass} onClick={() => handleSort('name')}>Campaign Name</th>
            <th className={thClass} onClick={() => handleSort('sent')}>Sent</th>
            <th className={thClass} onClick={() => handleSort('opened')}>Opened</th>
            <th className={thClass} onClick={() => handleSort('openRate')}>Open %</th>
            <th className={thClass} onClick={() => handleSort('replied')}>Replied</th>
            <th className={thClass} onClick={() => handleSort('replyRate')}>Reply %</th>
            <th className={thClass} onClick={() => handleSort('failed')}>Failed</th>
            <th className={thClass} onClick={() => handleSort('createdAt')}>Date</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map(row => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 border-b">{row.name}</td>
              <td className="px-4 py-3 border-b">{row.sent}</td>
              <td className="px-4 py-3 border-b">{row.opened}</td>
              <td className="px-4 py-3 border-b">{row.openRate.toFixed(1)}%</td>
              <td className="px-4 py-3 border-b">{row.replied}</td>
              <td className="px-4 py-3 border-b">{row.replyRate.toFixed(1)}%</td>
              <td className="px-4 py-3 border-b text-red-500">{row.failed}</td>
              <td className="px-4 py-3 border-b text-sm text-gray-500">{new Date(row.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
