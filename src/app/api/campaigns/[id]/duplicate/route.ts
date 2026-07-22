import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaign = await prisma.campaign.findUnique({ 
    where: { id: params.id, userId: user.id },
    include: { emailAccounts: true }
  })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const newCampaign = await prisma.campaign.create({
    data: {
      userId: user.id,
      name: `${campaign.name} (copy)`,
      templateId: campaign.templateId,
      emailAccounts: {
        connect: campaign.emailAccounts.map(ea => ({ id: ea.id }))
      },
      status: 'DRAFT'
    }
  })

  return NextResponse.json({ newId: newCampaign.id })
}


export const dynamic = 'force-dynamic'
