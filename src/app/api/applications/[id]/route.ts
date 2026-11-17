import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

const schema = z.object({
  status: z.enum(['APPLIED', 'REPLIED', 'INTERVIEW', 'OFFER', 'REJECTED', 'GHOSTED', 'WITHDRAWN']),
  note: z.string().max(500).optional(),
})

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const r = await prisma.application.updateMany({ where: { id, userId: user.id }, data: { status: parsed.data.status, lastEventAt: new Date() } })
  if (!r.count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.applicationEvent.create({ data: { applicationId: id, type: `STATUS_${parsed.data.status}`, note: parsed.data.note ?? 'Changed in the app' } })
  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'
