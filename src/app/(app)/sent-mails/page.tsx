import { getUser } from "@/lib/supabase";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { renderTemplate } from "@/lib/template-parser";
import SentMailsList from "./_components/SentMailsList";

export default async function SentMailsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; date?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || "1");
  const limit = 50;
  const skip = (page - 1) * limit;
  const dateStr = resolvedParams.date;

  const whereClause: {
    campaign: {
      userId: string;
    };
    type: "SENT";
    occurredAt?: {
      gte: Date;
      lte: Date;
    };
  } = {
    campaign: { userId: user.id },
    type: "SENT",
  };

  if (dateStr) {
    const startOfDay = new Date(dateStr);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setUTCHours(23, 59, 59, 999);
    whereClause.occurredAt = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  const total = await prisma.mailEvent.count({
    where: whereClause,
  });

  const events = await prisma.mailEvent.findMany({
    where: whereClause,
    include: {
      recipient: true,
      campaign: {
        include: { template: true },
      },
    },
    orderBy: { occurredAt: "desc" },
    skip,
    take: limit,
  });

  const initialSentMails = events.map((evt) => {
    const metadata = (evt.metadata as { accountId?: string; subject?: string; body?: string }) || {};
    const dynamicData =
      (evt.recipient.dynamicData as Record<string, string>) || {};

    const fallbackSubject = evt.campaign.template?.subject
      ? renderTemplate(evt.campaign.template.subject, dynamicData)
      : "[No Subject Stored]";

    const fallbackBody = evt.campaign.template?.body
      ? renderTemplate(evt.campaign.template.body, dynamicData)
      : "[No Body Stored]";

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
    };
  });

  // Fetch available accounts for the follow-up feature
  const accounts = await prisma.emailAccount.findMany({
    where: { userId: user.id, isActive: true },
    select: { id: true, label: true, fromEmail: true },
  });

  // Fetch templates for follow-up
  const templates = await prisma.template.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, subject: true, body: true },
  });

  return (
    <div className="skeu-page h-[100dvh] overflow-y-auto w-full flex flex-col">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4 w-full flex-1 flex flex-col">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4 shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              Sent Mails
            </h1>
            <p className="text-sm text-text-muted mt-1">
              View and follow up on all emails sent from your account.
            </p>
          </div>
        </div>

        <SentMailsList
          initialData={initialSentMails}
          totalItems={total}
          accounts={accounts}
          templates={templates}
          currentPage={page}
          totalPages={Math.ceil(total / limit)}
          currentDate={dateStr || undefined}
        />
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
