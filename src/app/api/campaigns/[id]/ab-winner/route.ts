import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { templateVariantId, subjectVariantId } = await request.json()
    
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id, userId: user.id }
    })

    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const tVariant = await prisma.aBTemplateVariant.findUnique({
      where: { id: templateVariantId, campaignId: campaign.id }
    })
    
    const sVariant = await prisma.aBSubjectVariant.findUnique({
      where: { id: subjectVariantId, templateVariantId: templateVariantId }
    })

    if (!tVariant || !sVariant) return NextResponse.json({ error: 'Variant not found' }, { status: 404 })

    await prisma.$transaction([
      prisma.campaign.update({
        where: { id: campaign.id },
        data: { winnerTemplateVariantId: tVariant.id, winnerSubjectVariantId: sVariant.id }
      }),
      prisma.aBTemplateVariant.update({
        where: { id: tVariant.id },
        data: { isWinner: true }
      }),
      prisma.aBSubjectVariant.update({
        where: { id: sVariant.id },
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
        data: { dynamicData: { ...dynamicData, _templateVariantId: tVariant.id, _subjectVariantId: sVariant.id } }
      })
    }))

    return NextResponse.json({ ok: true })
  } catch (_err: unknown) { const err = _err as Error;
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}


export const dynamic = 'force-dynamic'
