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
  variants: z.array(z.object({
    subject: z.string(),
    body: z.string()
  })).optional()
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
      const hasVariants = data.variants && data.variants.length > 0;
      
      const newCampaign = await tx.campaign.create({
        data: {
          userId: user.id,
          name: data.name,
          templateId: data.templateId,
          emailAccountId: data.emailAccountId,
          status: 'DRAFT', // Default to draft so the user can review before activating
          abEnabled: hasVariants,
        }
      })

      let createdVariants: any[] = [];
      if (hasVariants) {
        // Bulk create variants is not supported in SQLite, but we are using PostgreSQL so createMany works.
        // However, Prisma doesn't return created IDs with createMany easily unless using Postgres `createManyAndReturn` (Prisma 5.14+).
        // Let's create them sequentially to get their IDs so we can assign them to recipients.
        for (let i = 0; i < data.variants!.length; i++) {
          const variant = await tx.aBVariant.create({
            data: {
              campaignId: newCampaign.id,
              templateId: data.templateId,
              name: `Variant ${i + 1}`,
              subject: data.variants![i].subject,
              body: data.variants![i].body,
            }
          })
          createdVariants.push(variant);
        }
      }

      const recipientData = data.recipients.map((row, index) => {
        const { email, ...dynamicData } = row
        
        // Round-robin assignment of variant if A/B testing is enabled
        if (hasVariants && createdVariants.length > 0) {
          const assignedVariant = createdVariants[index % createdVariants.length];
          dynamicData._variantId = assignedVariant.id;
        }

        return {
          campaignId: newCampaign.id,
          email: String(email).trim().toLowerCase(),
          dynamicData: dynamicData,
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
