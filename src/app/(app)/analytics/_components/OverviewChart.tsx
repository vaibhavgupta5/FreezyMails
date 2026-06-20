'use client'

import { BarChart } from '@tremor/react'
import { CampaignStatRow } from '@/types'

export default function OverviewChart({ data }: { data: CampaignStatRow[] }) {
  // Use recent up to 10 campaigns to avoid overcrowding
  const chartData = data.slice(0, 10).reverse()

  return (
    <div className="w-full">
      <BarChart
        className="h-80 mt-4"
        data={chartData}
        index="name"
        categories={["sent", "opened", "replied"]}
        colors={["blue", "teal", "amber"]}
        yAxisWidth={48}
        valueFormatter={(number) => Intl.NumberFormat("us").format(number).toString()}
      />
    </div>
  )
}
