import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";
import CampaignStatsTable from "./_components/CampaignStatsTable";
import DailyAreaChart from "./_components/DailyAreaChart";
import FunnelChart from "./_components/FunnelChart";
import { BarChart2 } from "lucide-react";
import { Card } from "@tremor/react";

export default async function AnalyticsPage() {
 const user = await getUser();
 if (!user) return null;

 // 1. Fetch campaigns and reply counts
 const campaigns = await prisma.campaign.findMany({
 where: { userId: user.id },
 include: {
 _count: { select: { replies: true } },
 },
 orderBy: { createdAt: "desc" },
 });

 // 2. Fetch recipient status counts grouped by campaign
 const recipientCounts = await prisma.recipient.groupBy({
 by: ["campaignId", "status"],
 where: { campaign: { userId: user.id } },
 _count: { _all: true },
 });

 // 3. Fetch unique opens grouped by campaign
 // A recipient has opened if they have at least one OPENED mailEvent
 // In Prisma, we can just group by campaignId for all OPENED events,
 // but to get UNIQUE opens per recipient we'd need distinct or group by recipientId first.
 // We'll use a raw query for the unique opens to be efficient.
 const uniqueOpensRaw: { campaignId: string; opens: number }[] =
 await prisma.$queryRaw`
 SELECT "campaignId", CAST(COUNT(DISTINCT "recipientId") AS INTEGER) as opens
 FROM "MailEvent"
 WHERE "type" = 'OPENED' AND "campaignId" IN (SELECT id FROM "Campaign" WHERE "userId" = ${user.id})
 GROUP BY "campaignId"
 `;

 const openMap = new Map(uniqueOpensRaw.map((r) => [r.campaignId, r.opens]));

 const stats = campaigns.map((c) => {
 let sent = 0;
 let failed = 0;

 // Sum up the grouped statuses for this campaign
 recipientCounts.forEach((r) => {
 if (r.campaignId === c.id) {
 if (r.status === "SENT") sent += r._count._all;
 if (r.status === "FAILED") failed += r._count._all;
 }
 });

 const opened = openMap.get(c.id) || 0;
 const replied = c._count.replies;
 const openRate = sent > 0 ? (opened / sent) * 100 : 0;
 const replyRate = sent > 0 ? (replied / sent) * 100 : 0;

 return {
 id: c.id,
 name: c.name,
 createdAt: c.createdAt.toISOString(),
 sent,
 failed,
 opened,
 replied,
 openRate,
 replyRate,
 };
 });

 // Calculate overall KPIs
 const totalSent = stats.reduce((acc, c) => acc + c.sent, 0);
 const totalOpened = stats.reduce((acc, c) => acc + c.opened, 0);
 const totalReplied = stats.reduce((acc, c) => acc + c.replied, 0);

 const overallOpenRate =
 totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0.0";
 const overallReplyRate =
 totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : "0.0";

 return (
 <div className="p-8 max-w-7xl mx-auto space-y-8">
 <h1 className="text-2xl font-bold text-text-primary ">
 Analytics
 </h1>

 {stats.length === 0 ? (
 <div className="skeu-card flex flex-col items-center justify-center min-h-[300px] text-center space-y-4 -skeu-base border border-border-subtle ">
 <BarChart2
 size={64}
 className="text-text-muted dark:text-text-muted"
 />
 <div>
 <h3 className="text-lg font-semibold text-text-primary ">
 No data available
 </h3>
 <p className="text-text-muted dark:text-text-muted mt-1">
 Send your first campaign to see analytics.
 </p>
 </div>
 </div>
 ) : (
 <>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <Card className="skeu-card -skeu-base border border-border-subtle ">
 <h3 className="text-sm font-semibold text-text-muted dark:text-text-muted uppercase tracking-wider mb-2">
 Total Sent
 </h3>
 <div className="text-3xl font-bold text-primary-base dark:text-ice-400">
 {totalSent.toLocaleString()}
 </div>
 </Card>
 <Card className="skeu-card -skeu-base border border-border-subtle ">
 <h3 className="text-sm font-semibold text-text-muted dark:text-text-muted uppercase tracking-wider mb-2">
 Avg Open Rate
 </h3>
 <div className="flex items-end gap-2">
 <div className="text-3xl font-bold text-text-primary ">
 {overallOpenRate}%
 </div>
 <div className="text-sm text-text-muted dark:text-text-muted mb-1">
 ({totalOpened.toLocaleString()} opens)
 </div>
 </div>
 </Card>
 <Card className="skeu-card -skeu-base border border-border-subtle ">
 <h3 className="text-sm font-semibold text-text-muted dark:text-text-muted uppercase tracking-wider mb-2">
 Avg Reply Rate
 </h3>
 <div className="flex items-end gap-2">
 <div className="text-3xl font-bold text-text-primary ">
 {overallReplyRate}%
 </div>
 <div className="text-sm text-text-muted dark:text-text-muted mb-1">
 ({totalReplied.toLocaleString()} replies)
 </div>
 </div>
 </Card>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <Card className="skeu-card -skeu-base border border-border-subtle lg:col-span-2">
 <DailyAreaChart />
 </Card>
 <Card className="skeu-card -skeu-base border border-border-subtle ">
 <FunnelChart />
 </Card>
 </div>

 <div className="space-y-4">
 <h2 className="text-xl font-semibold text-text-primary ">
 Campaign Performance
 </h2>
 <CampaignStatsTable data={stats} />
 </div>
 </>
 )}
 </div>
 );
}
