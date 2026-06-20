'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Card, Title } from '@tremor/react'

export default function DailyAreaChart() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics/daily?range=30')
      .then(res => res.json())
      .then(json => {
        if (json.daily) setData(json.daily)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="h-[300px] flex items-center justify-center text-text-muted">Loading chart data...</div>
  }

  return (
    <>
      <Title>Daily Performance (Last 30 Days)</Title>
      <AreaChart
        className="h-72 mt-4"
        data={data}
        index="date"
        categories={['sent', 'opened', 'clicked', 'replied']}
        colors={['blue', 'emerald', 'amber', 'purple']}
        yAxisWidth={40}
        showAnimation
        curveType="monotone"
      />
    </>
  )
}
