import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { sendEmail } from '@/lib/mailer'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { body } = await request.json()
    
    const reply = await prisma.reply.findUnique({
      where: { id: params.id },
      include: {
        emailAccount: true,
        campaign: true,
      }
    })

    if (!reply || reply.campaign.userId !== user.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    const subject = reply.subject.startsWith('Re:') ? reply.subject : `Re: ${reply.subject}`

    await sendEmail(reply.emailAccount, reply.fromEmail, subject, body.replace(/\n/g, '<br/>'))

    const updatedReply = await prisma.reply.update({
      where: { id: params.id },
      data: { repliedAt: new Date() }
    })

    return NextResponse.json(updatedReply)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
