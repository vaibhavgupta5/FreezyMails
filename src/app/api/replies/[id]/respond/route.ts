import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUser } from '@/lib/supabase'
import { sendEmail } from '@/lib/mailer'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { body, subject: customSubject } = await request.json()
    
    let emailAccountToUse = null;
    let toEmailToUse = '';
    let defaultSubject = '';
    let campaignId = '';
    let recipientId = '';

    const reply = await prisma.reply.findUnique({
      where: { id: params.id },
      include: {
        emailAccount: true,
        campaign: true,
      }
    })

    if (reply) {
      if (reply.campaign.userId !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 404 });
      emailAccountToUse = reply.emailAccount?.isActive ? reply.emailAccount : null;
      if (!emailAccountToUse) {
        emailAccountToUse = await prisma.emailAccount.findFirst({ where: { userId: user.id, isActive: true } });
      }
      if (!emailAccountToUse) {
        let expected = reply.emailAccount?.fromEmail;
        if (!expected) {
          const fallbackAccount = await prisma.emailAccount.findFirst({ where: { userId: user.id } });
          expected = fallbackAccount?.fromEmail || user.email || "your email account";
        }
        return NextResponse.json({ error: `No active email account found. Please reconnect ${expected} in the accounts tab.` }, { status: 400 });
      }
      
      toEmailToUse = reply.fromEmail;
      defaultSubject = reply.subject.startsWith('Re:') ? reply.subject : `Re: ${reply.subject}`;
      campaignId = reply.campaignId;
      recipientId = reply.recipientId;
    } else {
      const event = await prisma.mailEvent.findUnique({
        where: { id: params.id },
        include: {
          campaign: {
            include: { emailAccounts: true }
          },
          recipient: true
        }
      });
      if (!event || event.campaign.userId !== user.id) {
        return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
      }

      const meta = event.metadata as { accountId?: string } | null;
      let expectedEmail = "";

      if (meta && meta.accountId) {
        const oldAcc = await prisma.emailAccount.findUnique({ where: { id: meta.accountId } });
        if (oldAcc) expectedEmail = oldAcc.fromEmail;
        if (oldAcc?.isActive) emailAccountToUse = oldAcc;
      }

      if (!emailAccountToUse) {
        emailAccountToUse = event.campaign.emailAccounts.find(a => a.isActive);
      }

      if (!emailAccountToUse) {
        emailAccountToUse = await prisma.emailAccount.findFirst({
          where: { userId: user.id, isActive: true }
        });
      }

      if (!emailAccountToUse) {
        if (!expectedEmail) {
          expectedEmail = event.campaign.emailAccounts[0]?.fromEmail || "";
        }
        if (!expectedEmail) {
          const fallbackAccount = await prisma.emailAccount.findFirst({ where: { userId: user.id } });
          expectedEmail = fallbackAccount?.fromEmail || user.email || "your email account";
        }
        return NextResponse.json({ error: `No active email account found. Please reconnect ${expectedEmail} in the accounts tab.` }, { status: 400 });
      }
      
      toEmailToUse = event.recipient.email;
      defaultSubject = 'Follow up';
      campaignId = event.campaignId;
      recipientId = event.recipientId;
    }

    const subject = customSubject || defaultSubject;

    const escapeHtml = (unsafe: string) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    const safeBody = escapeHtml(body).replace(/\n/g, '<br/>')

    await sendEmail(emailAccountToUse, toEmailToUse, subject, safeBody)

    if (reply) {
      await prisma.reply.update({
        where: { id: params.id },
        data: { repliedAt: new Date() }
      })
    } else {
      await prisma.mailEvent.create({
        data: {
          campaignId,
          recipientId,
          type: 'SENT',
          metadata: { isManualFollowUp: true }
        }
      })
    }

    return NextResponse.json({ success: true, repliedAt: new Date() })
  } catch (_err: unknown) { const err = _err as Error;
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
