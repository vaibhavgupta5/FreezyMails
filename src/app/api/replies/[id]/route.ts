import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import type { Prisma } from '@prisma/client'

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
    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (body.isRead !== undefined) data.isRead = body.isRead
    if (body.isFlagged !== undefined) data.isFlagged = body.isFlagged
    
    let updatedItem = null;
    try {
      updatedItem = await prisma.reply.update({
        where: { id: params.id },
        data
      })
    } catch {
      // If item is a sent MailEvent, update its metadata
      const mailEvent = await prisma.mailEvent.findUnique({
        where: { id: params.id },
      })
      if (mailEvent) {
        const existingMeta = (mailEvent.metadata as Record<string, unknown>) || {}
        const newMeta = { ...existingMeta, ...data }
        await prisma.mailEvent.update({
          where: { id: params.id },
          data: { metadata: newMeta as Prisma.InputJsonObject }
        })
        updatedItem = { id: params.id, ...data }
      }
    }
    
    return NextResponse.json(updatedItem || { success: true })
  } catch (_err: unknown) {
    const err = _err as Error;
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}

export const dynamic = 'force-dynamic'
