import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function POST() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const r = await prisma.outreach.updateMany({ where: { userId: user.id, status: 'DRAFT' }, data: { status: 'APPROVED', approvedAt: new Date() } })
  return NextResponse.json({ approved: r.count })
}

export const dynamic = 'force-dynamic'
