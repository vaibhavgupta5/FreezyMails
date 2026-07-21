import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import boss, { JOB_SEND_EMAIL } from '@/lib/queue'
import { distributeJobs } from '@/lib/scheduling'

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
          where: { status: 'PENDING' }
        },
        emailAccounts: true
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
      if (campaign.emailAccounts.length === 0) continue;
      
      let accountIndex = 0;
      const jobs: Record<string, unknown>[] = campaign.recipients.map(recipient => {
        const account = campaign.emailAccounts[accountIndex];
        accountIndex = (accountIndex + 1) % campaign.emailAccounts.length;
        
        return {
          data: {
            campaignId: campaign.id,
            recipientId: recipient.id,
            accountId: account.id,
            templateVariantId: (recipient.dynamicData as Record<string, unknown>)?._templateVariantId as string | undefined || null,
            subjectVariantId: (recipient.dynamicData as Record<string, unknown>)?._subjectVariantId as string | undefined || null,
            sequenceStepId: null
          },
          options: {
            retryLimit: 3,
            retryBackoff: true
          }
        };
      });

      if (jobs.length > 0) {
        const finalJobs = distributeJobs(jobs, campaign.pacingType);
        await boss.insert(JOB_SEND_EMAIL, finalJobs);
      }
    }

    return NextResponse.json({ success: true, processed: campaignsToStart.length });
  } catch (_error: unknown) { const error = _error as Error;
    console.error('Failed to process scheduled campaigns:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
