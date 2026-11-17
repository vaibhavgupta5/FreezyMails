import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { getAgentState, MAX_DAILY_CAP } from '@/lib/agent'
import { getOrCreateProfile } from '@/lib/profile'

const schema = z.object({ paused: z.boolean().optional(), dailyCap: z.number().int().min(1).max(MAX_DAILY_CAP).optional() })

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await getAgentState(user.id))
}

export async function PATCH(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const profile = await getOrCreateProfile(user.id)
  const prefs = (profile.preferences ?? {}) as Record<string, unknown>
  await prisma.profile.update({
    where: { userId: user.id },
    data: {
      ...(parsed.data.paused !== undefined ? { agentPaused: parsed.data.paused } : {}),
      ...(parsed.data.dailyCap !== undefined ? { preferences: { ...prefs, dailyOutreachCap: parsed.data.dailyCap } } : {}),
    },
  })
  // Kill switch: stop everything already in motion. Queued jobs for paused campaigns abort in the worker.
  if (parsed.data.paused === true) {
    await prisma.campaign.updateMany({ where: { userId: user.id, status: { in: ['SENDING', 'SCHEDULED'] } }, data: { status: 'PAUSED' } })
  }
  return NextResponse.json(await getAgentState(user.id))
}

export const dynamic = 'force-dynamic'
