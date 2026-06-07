import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit

  const campaigns = await prisma.campaign.findMany({
    where: { userId: user.id },
    select: { id: true }
  })
  const campaignIds = campaigns.map(c => c.id)

  const [replies, total] = await Promise.all([
    prisma.reply.findMany({
      where: { campaignId: { in: campaignIds } },
      orderBy: { receivedAt: 'desc' },
      skip,
      take: limit,
      include: {
        campaign: { select: { name: true } },
        recipient: { select: { email: true, dynamicData: true } }
      }
    }),
    prisma.reply.count({
      where: { campaignId: { in: campaignIds } }
    })
  ])

  return NextResponse.json({ replies, total, page, limit })
}
