import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request, props: { params: Promise<{ recipientId: string }> }) {
  const params = await props.params;
  const recipientId = params.recipientId

  try {
    const recipient = await prisma.recipient.findUnique({
      where: { id: recipientId },
      include: { campaign: true }
    })

    if (!recipient) {
      return new NextResponse('Not found', { status: 404 })
    }

    await prisma.$transaction([
      prisma.suppression.upsert({
        where: { userId_email: { userId: recipient.campaign.userId, email: recipient.email } },
        update: {},
        create: { userId: recipient.campaign.userId, email: recipient.email, reason: 'Unsubscribed' }
      }),
      prisma.recipient.update({
        where: { id: recipientId },
        data: { status: 'FAILED', failReason: 'Unsubscribed' }
      })
    ])

    const html = `
<!DOCTYPE html>
<html>
<head><title>Unsubscribed</title><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb}div{text-align:center;padding:2rem;max-width:400px}h1{font-size:1.5rem;margin-bottom:0.5rem}p{color:#6b7280}</style></head>
<body><div><h1>You've been unsubscribed.</h1><p>You won't receive any more emails from this sender.</p></div></body>
</html>
`
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
  } catch (err) {
    console.error('Error unsubscribing:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
