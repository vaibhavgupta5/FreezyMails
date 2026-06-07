import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const reply = await prisma.reply.findUnique({
    where: { id: params.id },
    include: {
      recipient: true,
      campaign: { include: { template: true } },
    }
  })

  if (!reply || reply.campaign.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(reply)
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { isRead } = await request.json()
    
    const reply = await prisma.reply.update({
      where: { id: params.id },
      data: { isRead }
    })
    
    return NextResponse.json(reply)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
