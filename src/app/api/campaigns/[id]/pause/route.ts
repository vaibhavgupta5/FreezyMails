import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({ where: { id: params.id, userId: user.id } })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: 'PAUSED' }
  })

  return NextResponse.json({ ok: true })
}


export const dynamic = 'force-dynamic'
