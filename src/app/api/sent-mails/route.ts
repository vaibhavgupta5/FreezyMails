import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getUser } from '@/lib/supabase'
import { renderTemplate } from '@/lib/template-parser'

export async function GET(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const dateStr = searchParams.get('date')
  const skip = (page - 1) * limit

  const whereClause: Prisma.MailEventWhereInput = {
    campaign: { userId: user.id },
    type: 'SENT'
  }

  if (dateStr) {
    const startOfDay = new Date(dateStr)
    startOfDay.setUTCHours(0, 0, 0, 0)
    const endOfDay = new Date(dateStr)
    endOfDay.setUTCHours(23, 59, 59, 999)
    
    whereClause.occurredAt = {
      gte: startOfDay,
      lte: endOfDay
    }
  }

  try {
    const total = await prisma.mailEvent.count({
      where: whereClause
    })

    const events = await prisma.mailEvent.findMany({
      where: whereClause,
      include: {
        recipient: true,
        campaign: {
          include: { template: true }
        },
      },
      orderBy: { occurredAt: 'desc' },
      skip,
      take: limit
    })

    // Formatting for the UI
    const sentMails = events.map(evt => {
      const metadata = (evt.metadata as { accountId?: string; subject?: string; body?: string }) || {}
      const dynamicData = (evt.recipient.dynamicData as Record<string, string>) || {};
      
      const fallbackSubject = evt.campaign.template?.subject 
        ? renderTemplate(evt.campaign.template.subject, dynamicData) 
        : '[No Subject Stored]';
        
      const fallbackBody = evt.campaign.template?.body 
        ? renderTemplate(evt.campaign.template.body, dynamicData) 
        : '[No Body Stored]';

      return {
        id: evt.id,
        recipientId: evt.recipientId,
        accountId: metadata.accountId || null,
        email: evt.recipient.email,
        campaignId: evt.campaignId,
        campaignName: evt.campaign.name,
        sentAt: evt.occurredAt.toISOString(),
        subject: metadata.subject || fallbackSubject,
        body: metadata.body || fallbackBody,
      }
    })

    return NextResponse.json({
      sentMails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
