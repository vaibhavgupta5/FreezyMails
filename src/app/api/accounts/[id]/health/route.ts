import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { computeHealthScore } from '@/lib/health'
import { getUser } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const account = await prisma.emailAccount.findUnique({
    where: { id: params.id, userId: user.id }
  })
  
  if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const score = await computeHealthScore(account.id)
  
  await prisma.emailAccount.update({
    where: { id: account.id },
    data: { healthScore: score }
  })
  
  return NextResponse.json({ score })
}
