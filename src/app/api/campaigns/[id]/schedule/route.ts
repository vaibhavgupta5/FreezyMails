import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id, userId: user.id }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (!campaign.scheduledAt || new Date(campaign.scheduledAt) <= new Date()) {
      return NextResponse.json({ error: 'Cannot schedule campaign without a future scheduled time' }, { status: 400 })
    }

    await prisma.campaign.update({
      where: { id: params.id },
      data: { status: 'SCHEDULED' }
    })

    return NextResponse.json({ success: true, status: 'SCHEDULED' })
  } catch (error: any) {
    console.error('Schedule campaign error:', error)
    return NextResponse.json({ error: error.message || 'Failed to schedule campaign' }, { status: 500 })
  }
}
