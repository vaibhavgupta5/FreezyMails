import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { variantId } = await request.json()
    
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id, userId: user.id }
    })

    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const variant = await prisma.aBVariant.findUnique({
      where: { id: variantId, campaignId: campaign.id }
    })

    if (!variant) return NextResponse.json({ error: 'Variant not found' }, { status: 404 })

    await prisma.$transaction([
      prisma.campaign.update({
        where: { id: campaign.id },
        data: { winnerVariantId: variant.id }
      }),
      prisma.aBVariant.update({
        where: { id: variant.id },
        data: { isWinner: true }
      })
    ])
    
    const pendingRecipients = await prisma.recipient.findMany({
      where: { campaignId: campaign.id, status: 'PENDING' }
    })

    await Promise.all(pendingRecipients.map(recipient => {
      const dynamicData = (recipient.dynamicData as Record<string, unknown>) || {}
      return prisma.recipient.update({
        where: { id: recipient.id },
        data: { dynamicData: { ...dynamicData, _variantId: variant.id } }
      })
    }))

    return NextResponse.json({ ok: true })
  } catch (_err: unknown) { const err = _err as Error;
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
