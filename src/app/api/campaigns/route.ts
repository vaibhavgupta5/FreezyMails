import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { z } from 'zod'

const campaignSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  templateId: z.string().min(1, 'Template is required'),
  emailAccountId: z.string().min(1, 'Email Account is required'),
  recipients: z.array(
    z.object({
      email: z.string().email('Invalid email address')
    }).passthrough()
  ).min(1, 'At least one recipient is required'),
})

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const payload = await request.json()
    const data = campaignSchema.parse(payload)

    // Verify ownership of template and account
    const template = await prisma.template.findUnique({ where: { id: data.templateId, userId: user.id } })
    const account = await prisma.emailAccount.findUnique({ where: { id: data.emailAccountId, userId: user.id } })

    if (!template || !account) {
      return NextResponse.json({ error: 'Invalid template or email account' }, { status: 400 })
    }

    // Create Campaign and Recipients in an atomic transaction
    const campaign = await prisma.$transaction(async (tx) => {
      const newCampaign = await tx.campaign.create({
        data: {
          userId: user.id,
          name: data.name,
          templateId: data.templateId,
          emailAccountId: data.emailAccountId,
          status: 'DRAFT', // Default to draft so the user can review before activating
        }
      })

      const recipientData = data.recipients.map(row => {
        // Extract the required email field, and dump everything else into dynamicData
        const { email, ...dynamicData } = row
        return {
          campaignId: newCampaign.id,
          email: String(email).trim().toLowerCase(),
          dynamicData: dynamicData,
          // status defaults to 'PENDING'
        }
      })

      // Bulk create recipients
      await tx.recipient.createMany({
        data: recipientData
      })

      return newCampaign
    })

    return NextResponse.json({ id: campaign.id })
  } catch (err: any) {
    console.error('Campaign creation error:', err)
    return NextResponse.json({ error: err.message || 'Failed to create campaign' }, { status: 400 })
  }
}
