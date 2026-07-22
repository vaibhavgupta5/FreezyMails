import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id, userId: user.id },
    select: { id: true }
  })

  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const recipients = await prisma.recipient.findMany({
    where: { campaignId: params.id },
    orderBy: { createdAt: 'asc' }
  })

  return NextResponse.json(recipients)
}


export const dynamic = 'force-dynamic'
