'use client'

import { useEffect, useState } from 'react'
import { BarList, Card, Title, Text } from '@tremor/react'

export default function FunnelChart() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics/daily?range=30')
      .then(res => res.json())
      .then(json => {
        if (json.funnel) {
          setData([
            { name: 'Sent', value: json.funnel.sent, color: 'blue' },
            { name: 'Opened', value: json.funnel.opened, color: 'emerald' },
            { name: 'Clicked', value: json.funnel.clicked, color: 'amber' },
            { name: 'Replied', value: json.funnel.replied, color: 'purple' },
          ])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="h-[200px] flex items-center justify-center text-text-muted">Loading funnel...</div>
  }

  return (
    <>
      <Title>Conversion Funnel</Title>
      <Text className="mb-4">Aggregate over the last 30 days</Text>
      <BarList data={data} className="mt-2" showAnimation />
    </>
  )
}
