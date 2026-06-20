import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import boss, { JOB_SEND_EMAIL } from '@/lib/queue'

// This endpoint is meant to be called by a cron job (e.g. Vercel Cron) every 5 minutes
export async function POST(request: Request) {
  // Optional: add basic auth or secret token check here
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    // Find campaigns that are SCHEDULED and their scheduledAt time has passed
    const campaignsToStart = await prisma.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          lte: new Date()
        }
      },
      include: {
        recipients: {
          where: { status: 'PENDING' },
          select: { id: true }
        }
      }
    });

    if (campaignsToStart.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    for (const campaign of campaignsToStart) {
      // Transition to SENDING
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'SENDING' }
      });

      // Enqueue the first step for all pending recipients
      for (const recipient of campaign.recipients) {
        await boss.send(JOB_SEND_EMAIL, {
          campaignId: campaign.id,
          recipientId: recipient.id,
          sequenceStepId: null // initial email
        });
      }
    }

    return NextResponse.json({ success: true, processed: campaignsToStart.length });
  } catch (error: any) {
    console.error('Failed to process scheduled campaigns:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
