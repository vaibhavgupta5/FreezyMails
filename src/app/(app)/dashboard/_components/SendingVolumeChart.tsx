"use client"

import { Bar, BarChart, CartesianGrid, XAxis, Tooltip } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export function SendingVolumeChart({ data }: { data: { date: Date; count: number; label: string }[] }) {
  // Config for shadcn chart
  const chartConfig = {
    count: {
      label: "Emails Sent",
      color: "var(--primary-base)",
    },
  }

  return (
    <div className="h-32 mt-4 pt-4 border-t border-border-subtle w-full">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <BarChart accessibilityLayer data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent className="bg-primary-base text-primary-text border-transparent [&_.text-muted-foreground]:text-primary-text/80 [&_.text-foreground]:text-primary-text" />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
