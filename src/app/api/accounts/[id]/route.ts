import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const account = await prisma.emailAccount.findUnique({
      where: { id: params.id, userId: user.id }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    await prisma.emailAccount.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (_err: unknown) {
    const err = _err as Error;
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
