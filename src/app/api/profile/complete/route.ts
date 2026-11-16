import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { computeSetupStatus } from '@/lib/profile'

export async function POST() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Mark done, then re-check the requirements. Completion only counts while they hold.
  const before = await computeSetupStatus(user.id)
  if (before.missing.length > 0) {
    return NextResponse.json({ error: 'Setup is incomplete', missing: before.missing }, { status: 400 })
  }
  await prisma.profile.update({ where: { userId: user.id }, data: { setupCompletedAt: new Date() } })
  return NextResponse.json(await computeSetupStatus(user.id))
}

export const dynamic = 'force-dynamic'
