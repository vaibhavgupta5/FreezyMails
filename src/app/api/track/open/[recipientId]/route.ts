import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { MailEventType } from '@prisma/client'

// 1x1 transparent GIF base64 encoded
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(request: Request, props: { params: Promise<{ recipientId: string }> }) {
  const params = await props.params;
  const recipientId = params.recipientId

  try {
    const recipient = await prisma.recipient.findUnique({
      where: { id: recipientId },
      include: {
        mailEvents: {
          where: { type: 'OPENED' }
        }
      }
    })

    if (recipient) {
      // Only track first open to prevent duplicate events
      if (recipient.mailEvents.length === 0) {
        await prisma.mailEvent.create({
          data: {
            recipientId: recipient.id,
            campaignId: recipient.campaignId,
            type: MailEventType.OPENED
          }
        })
      }
    }
  } catch (error) {
    console.error('Error tracking open:', error)
  }

  // Always return the transparent GIF
  return new NextResponse(TRANSPARENT_GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
