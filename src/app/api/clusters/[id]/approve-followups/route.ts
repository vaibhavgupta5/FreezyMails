import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { followUpsHash, type FollowUp } from '@/lib/agent'

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const c = await prisma.cluster.findFirst({ where: { id, userId: user.id } })
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const fu = c.followUps as unknown as FollowUp[]
  if (!Array.isArray(fu) || fu.length === 0) return NextResponse.json({ error: 'No follow-ups to approve' }, { status: 400 })
  await prisma.cluster.update({ where: { id }, data: { followUpsApprovedHash: followUpsHash(fu) } })
  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'
