import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { FACT_KINDS, FACT_STATUSES, getOrCreateProfile } from '@/lib/profile'

const createSchema = z.object({
  text: z.string().trim().min(5).max(300),
  kind: z.enum(FACT_KINDS).default('OTHER'),
  sourceUrl: z.string().url().nullable().optional(),
})

const bulkSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  status: z.enum(FACT_STATUSES),
})

// A fact you add yourself is approved immediately.
export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })

  const profile = await getOrCreateProfile(user.id)
  const fact = await prisma.profileFact.create({
    data: { profileId: profile.id, ...parsed.data, status: 'APPROVED', proposedBy: 'user' },
  })
  return NextResponse.json(fact, { status: 201 })
}

export async function PATCH(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = bulkSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })

  const result = await prisma.profileFact.updateMany({
    where: { id: { in: parsed.data.ids }, profile: { userId: user.id } },
    data: { status: parsed.data.status },
  })
  return NextResponse.json({ updated: result.count })
}

export const dynamic = 'force-dynamic'
