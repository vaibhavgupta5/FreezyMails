import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { FACT_KINDS, FACT_STATUSES } from '@/lib/profile'

const patchSchema = z.object({
  text: z.string().trim().min(5).max(300).optional(),
  kind: z.enum(FACT_KINDS).optional(),
  status: z.enum(FACT_STATUSES).optional(),
})

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })

  const result = await prisma.profileFact.updateMany({ where: { id, profile: { userId: user.id } }, data: parsed.data })
  if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await prisma.profileFact.deleteMany({ where: { id, profile: { userId: user.id } } })
  if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}

export const dynamic = 'force-dynamic'
