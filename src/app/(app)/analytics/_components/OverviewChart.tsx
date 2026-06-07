'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

import { CampaignStatRow } from '@/types'

export default function OverviewChart({ data }: { data: CampaignStatRow[] }) {
  // Use recent up to 10 campaigns to avoid overcrowding
  const chartData = data.slice(0, 10).reverse()

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%" minHeight={320} minWidth={0}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" truncateByToEllipsis={true} tick={{fontSize: 12}} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="sent" fill="#3b82f6" name="Sent" />
          <Bar dataKey="opened" fill="#10b981" name="Opened" />
          <Bar dataKey="replied" fill="#f59e0b" name="Replied" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
