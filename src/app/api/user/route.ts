import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function PATCH(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, defaultAccountId } = await request.json()
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name, defaultAccountId: defaultAccountId || null }
    })
    return NextResponse.json(updated)
  } catch (_err: unknown) { const err = _err as Error;
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { action, confirmation } = await request.json()
    
    if (action === 'delete_campaigns') {
      if (confirmation !== 'CONFIRM') return NextResponse.json({ error: 'Invalid confirmation' }, { status: 400 })
      await prisma.campaign.deleteMany({ where: { userId: user.id } })
      return NextResponse.json({ ok: true })
    } else if (action === 'delete_account') {
      if (confirmation !== user.email) return NextResponse.json({ error: 'Invalid confirmation' }, { status: 400 })
      await prisma.user.delete({ where: { id: user.id } })
      return NextResponse.json({ ok: true })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (_err: unknown) { const err = _err as Error;
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}


export const dynamic = 'force-dynamic'
