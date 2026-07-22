import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { type } = await request.json()

    const campaign = await prisma.campaign.findUnique({ where: { id: params.id, userId: user.id } })
    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const recipientFilter: Record<string, unknown> = { campaignId: campaign.id }
    if (type === 'failed') {
      recipientFilter.status = { in: ['FAILED', 'BOUNCED'] }
    }

    await prisma.$transaction([
      prisma.recipient.updateMany({
        where: recipientFilter,
        data: {
          status: 'PENDING',
          sentAt: null,
          failReason: null,
        }
      }),
      prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'DRAFT' } // reset to draft temporarily, frontend will hit /api/send next
      })
    ])

    return NextResponse.json({ success: true })
  } catch (_error: unknown) { const error = _error as Error;
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


export const dynamic = 'force-dynamic'
