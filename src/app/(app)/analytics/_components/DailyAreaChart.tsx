'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Card, Title } from '@tremor/react'
import { Skeleton } from "@/components/ui/skeleton";

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
    return (
      <div className="h-[300px] flex items-end space-x-2">
        <Skeleton className="h-[20%] w-full" />
        <Skeleton className="h-[40%] w-full" />
        <Skeleton className="h-[30%] w-full" />
        <Skeleton className="h-[60%] w-full" />
        <Skeleton className="h-[50%] w-full" />
        <Skeleton className="h-[80%] w-full" />
        <Skeleton className="h-[70%] w-full" />
      </div>
    );
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
