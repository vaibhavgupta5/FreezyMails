import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { subDays, startOfDay, format } from 'date-fns'

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const rangeStr = searchParams.get('range') || '30'
  const range = parseInt(rangeStr, 10)
  const startDate = startOfDay(subDays(new Date(), range - 1))

  try {
    const campaigns = await prisma.campaign.findMany({
      where: { userId: user.id },
      select: { id: true }
    })
    const campaignIds = campaigns.map(c => c.id)

    if (campaignIds.length === 0) {
      return NextResponse.json({ daily: [], funnel: { sent: 0, opened: 0, clicked: 0, replied: 0 } })
    }

    const events = await prisma.mailEvent.findMany({
      where: {
        campaignId: { in: campaignIds },
        occurredAt: { gte: startDate }
      },
      select: { type: true, occurredAt: true }
    })

    // Initialize daily buckets
    const dailyMap = new Map<string, { date: string; sent: number; opened: number; clicked: number; replied: number }>()
    for (let i = 0; i < range; i++) {
      const d = subDays(new Date(), i)
      const dateStr = format(d, 'MMM dd')
      dailyMap.set(dateStr, { date: dateStr, sent: 0, opened: 0, clicked: 0, replied: 0 })
    }

    const funnel = { sent: 0, opened: 0, clicked: 0, replied: 0 }

    for (const ev of events) {
      const dateStr = format(ev.occurredAt, 'MMM dd')
      const bucket = dailyMap.get(dateStr)
      if (bucket) {
        if (ev.type === 'SENT') bucket.sent++
        if (ev.type === 'OPENED') bucket.opened++
        if (ev.type === 'CLICKED') bucket.clicked++
        if (ev.type === 'REPLIED') bucket.replied++
      }

      if (ev.type === 'SENT') funnel.sent++
      if (ev.type === 'OPENED') funnel.opened++
      if (ev.type === 'CLICKED') funnel.clicked++
      if (ev.type === 'REPLIED') funnel.replied++
    }

    // Convert map to array and reverse to chronological order
    const daily = Array.from(dailyMap.values()).reverse()

    return NextResponse.json({ daily, funnel })
  } catch (_error: unknown) { const error = _error as Error;
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
