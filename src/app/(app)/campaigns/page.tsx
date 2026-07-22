import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";
import CampaignList from "./_components/CampaignList";

export default async function CampaignsPage() {
  const user = await getUser();
  if (!user) return null;

  let campaignsData = [];

  try {
    campaignsData = await prisma.campaign.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        recipients: {
          select: { status: true },
        },
        mailEvents: {
          select: { type: true, occurredAt: true },
        },
      },
    });
  } catch (error) {
    console.error("[Campaigns] DATABASE ERROR:", error);
    return (
      <div className="skeu-page p-8">
        <div className="max-w-2xl mx-auto p-8 mt-12 text-center text-red-500 bg-red-500/10 rounded-md border border-red-500/20">
          <h2 className="text-lg font-semibold mb-2">Database Connection Failed</h2>
          <p>We could not connect to the database to load your campaigns.</p>
        </div>
      </div>
    );
  }

  // Pre-calculate stats on the server
  const calculatedCampaigns = campaignsData.map((c) => {
    let sent = 0;
    let opens = 0;
    let replies = 0;
    let lastSentAt: Date | null = null;

    c.recipients.forEach((r) => {
      if (r.status === "SENT") sent++;
    });

    c.mailEvents.forEach((e) => {
      if (e.type === "OPENED") opens++;
      if (e.type === "REPLIED") replies++;
      if (e.type === "SENT") {
        sent++; // count SENT events as well for accuracy
        if (!lastSentAt || e.occurredAt > lastSentAt) {
          lastSentAt = e.occurredAt;
        }
      }
    });

    // Remove duplicates if a recipient was both SENT status and has a SENT event
    const uniqueSent = c.recipients.filter((r) => r.status === "SENT").length;
    const finalSent = Math.max(
      uniqueSent,
      c.mailEvents.filter((e) => e.type === "SENT").length,
    );

    return {
      id: c.id,
      name: c.name,
      status: c.status,
      dailyLimit: c.dailyLimit,
      createdAt: c.createdAt.toISOString(),
      stats: {
        sent: finalSent,
        opens,
        replies,
        lastSentAt: lastSentAt ? (lastSentAt as Date).toISOString() : null,
      },
    };
  });

  return (
    <div className="skeu-page">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <CampaignList initialCampaigns={calculatedCampaigns} />
      </div>
    </div>
  );
}
