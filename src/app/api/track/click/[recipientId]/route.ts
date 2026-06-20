import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { MailEventType } from '@prisma/client'

export async function GET(request: Request, props: { params: Promise<{ recipientId: string }> }) {
  const params = await props.params;
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get('url')

  if (!targetUrl) {
    return new NextResponse('Missing URL', { status: 400 })
  }

  const recipientId = params.recipientId

  try {
    const recipient = await prisma.recipient.findUnique({
      where: { id: recipientId },
    })

    if (recipient) {
      const existingClick = await prisma.mailEvent.findFirst({
        where: {
          recipientId,
          type: MailEventType.CLICKED,
        },
      })

      if (!existingClick) {
        await prisma.mailEvent.create({
          data: {
            recipientId,
            campaignId: recipient.campaignId,
            type: MailEventType.CLICKED,
            metadata: { url: targetUrl },
          },
        })
      }
    }
  } catch (err) {
    console.error('Error tracking click:', err)
  }

  return NextResponse.redirect(targetUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
