import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { isWarmupEnabled } = await request.json()

    if (typeof isWarmupEnabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid isWarmupEnabled value' }, { status: 400 })
    }

    const account = await prisma.emailAccount.update({
      where: { id: params.id, userId: user.id },
      data: { isWarmupEnabled }
    })

    return NextResponse.json(account)
  } catch (_error: unknown) { const error = _error as Error;
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
