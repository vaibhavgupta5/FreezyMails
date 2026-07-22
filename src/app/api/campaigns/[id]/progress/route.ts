import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id, userId: user.id },
    select: { status: true }
  })

  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const aggregates = await prisma.recipient.groupBy({
    by: ['status'],
    where: { campaignId: params.id },
    _count: { _all: true }
  })

  let total = 0
  let sent = 0
  let failed = 0
  let pending = 0

  aggregates.forEach(agg => {
    total += agg._count._all
    if (agg.status === 'SENT') sent += agg._count._all
    else if (agg.status === 'FAILED') failed += agg._count._all
    else if (agg.status === 'PENDING') pending += agg._count._all
  })

  return NextResponse.json({
    status: campaign.status,
    total,
    sent,
    failed,
    pending,
  })
}


export const dynamic = 'force-dynamic'
