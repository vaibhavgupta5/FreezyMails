import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase'
import { queueApprovedOutreach } from '@/lib/agent'

export const maxDuration = 60

export async function POST() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await queueApprovedOutreach(user.id))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}

export const dynamic = 'force-dynamic'
