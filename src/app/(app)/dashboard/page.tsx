import { Users, Settings } from "lucide-react";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";
import Link from "next/link";
import { Card } from "@/components/ui/card";

function timeAgo(date: Date) {
 const diff = new Date().getTime() - date.getTime();
 const hours = Math.floor(diff / (1000 * 60 * 60));
 if (hours < 1) return "Just now";
 if (hours < 24) return `${hours}h ago`;
 const days = Math.floor(hours / 24);
 if (days === 1) return "Yesterday";
 return `${days}d ago`;
}

export default async function Dashboard() {
 const user = await getUser();
 if (!user) return null;

 const firstName =
 user.user_metadata?.full_name?.split(" ")[0] ||
 user.email?.split("@")[0] ||
 "there";

 const now = new Date();

 const sevenDaysAgo = new Date(now);
 sevenDaysAgo.setDate(now.getDate() - 7);

 // Fetch Data
 const [
 accounts,
 campaigns,
 eventsLast7Days,
 recipients,
 ] = await Promise.all([
 prisma.emailAccount.findMany({
 where: { userId: user.id, isActive: true },
 }),
 prisma.campaign.findMany({
 where: { userId: user.id },
 include: { _count: { select: { recipients: true } } },
 }),
 prisma.mailEvent.findMany({
 where: {
 campaign: { userId: user.id },
 occurredAt: { gte: sevenDaysAgo },
 },
 }),
 prisma.recipient.findMany({
 where: { campaign: { userId: user.id } },
 include: { mailEvents: true, campaign: true, replies: true },
 }),
 ]);

 // --- YC-STYLE STAT CALCULATIONS ---

 // 1. Deliverability Health
 const activeAccounts = accounts.filter(a => a.isActive);
 const avgHealth = activeAccounts.length > 0 
 ? Math.round(activeAccounts.reduce((acc, a) => acc + a.healthScore, 0) / activeAccounts.length) 
 : 0;
 
 const warmingCount = activeAccounts.filter(a => a.isWarmupEnabled && a.warmupDay < 14).length;
 const readyCount = activeAccounts.length - warmingCount;
 
 const totalSentEvents = eventsLast7Days.filter(e => e.type === "SENT").length;
 const totalBounceEvents = eventsLast7Days.filter(e => e.type === "BOUNCED").length;
 const bounceRateWeek = totalSentEvents > 0 ? ((totalBounceEvents / totalSentEvents) * 100).toFixed(1) : "0.0";

 // 2. Sending Volume Trend (last 7 days)
 const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
 const d = new Date(now);
 d.setDate(d.getDate() - (6 - i));
 d.setHours(0, 0, 0, 0);
 return { date: d, count: 0, label: d.toLocaleDateString("en-US", { weekday: "short" }) };
 });

 eventsLast7Days.filter(e => e.type === "SENT").forEach(e => {
 const d = new Date(e.occurredAt);
 d.setHours(0, 0, 0, 0);
 const dayData = last7DaysData.find(day => day.date.getTime() === d.getTime());
 if (dayData) {
 dayData.count++;
 }
 });
 
 const maxVolume = Math.max(...last7DaysData.map(d => d.count), 1);

 // --- ACTIVE CAMPAIGNS ---
 const activeCampaigns = campaigns
 .filter(c => c.status === "SENDING" || c.status === "SCHEDULED")
 .map(c => {
 const campRecipients = recipients.filter(r => r.campaignId === c.id);
 const total = campRecipients.length;
 const sent = campRecipients.filter(r => r.status === "SENT" || r.status === "BOUNCED" || r.status === "FAILED").length;
 const progress = total > 0 ? Math.round((sent / total) * 100) : 0;
 return { id: c.id, name: c.name, status: c.status, progress, sent, total };
 })
 .sort((a, b) => b.sent - a.sent)
 .slice(0, 5);

 // --- FEED GENERATION (Actionable Audit Log) ---
 const feedItems: {
 type: "draft" | "fix";
 title: string;
 subtitle: string;
 date: Date;
 initial: string;
 link: string;
 }[] = [];

 const drafts = campaigns.filter((c) => c.status === "DRAFT");
 for (const draft of drafts) {
 feedItems.push({
 type: "draft",
 title: `Draft: ${draft.name || "Untitled"}`,
 subtitle: `${draft._count?.recipients || 0} recipients ready to send`,
 date: new Date(draft.updatedAt || new Date()),
 initial: "D",
 link: `/campaigns/${draft.id}`,
 });
 }

 const failedRecipients = recipients.filter(
 (r) => r.status === "FAILED" || r.status === "BOUNCED",
 );
 const recentFailed = failedRecipients.filter(
 (r) => (r.createdAt ? new Date(r.createdAt) > sevenDaysAgo : false),
 );
 for (const r of recentFailed) {
 feedItems.push({
 type: "fix",
 title: `Delivery Issue: ${r.email || "Unknown"}`,
 subtitle: `${r.campaign?.name || "Unknown Campaign"} · ${r.failReason || "Bounced"}`,
 date: new Date(r.sentAt || r.createdAt || new Date()),
 initial: (r.email || "U").charAt(0).toUpperCase(),
 link: `/campaigns/${r.campaign?.id || ""}`,
 });
 }

 feedItems.sort((a, b) => b.date.getTime() - a.date.getTime());
 const topFeed = feedItems.slice(0, 6);

 const formatter = new Intl.DateTimeFormat("en-GB", {
 weekday: "long",
 day: "numeric",
 month: "long",
 });
 const dateString = formatter.format(now);

 return (
 <div className="skeu-page">
 <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
 {/* HEADER */}
 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center items-start gap-4">
 <div>
 <h1 className="text-xl font-semibold text-text-primary">
 Good morning, {firstName}
 </h1>
 <p className="text-sm text-text-muted">{dateString}</p>
 </div>
 <Link href="/campaigns/new" className="skeu-btn-primary whitespace-nowrap">
 + New campaign
 </Link>
 </div>

 {/* TOP METRICS (YC Style) */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
 
 {/* Sending Volume Chart */}
 <Card className="skeu-card p-5 lg:col-span-2 flex flex-col justify-between">
 <div>
 <h2 className="text-xs font-semibold tracking-widest text-text-muted uppercase mb-1">
 Sending Volume (7d)
 </h2>
 <div className="text-2xl font-bold text-text-primary">{totalSentEvents} <span className="text-sm font-normal text-text-muted">emails sent</span></div>
 </div>
 <div className="flex items-end gap-2 h-32 mt-4 pt-4 border-t border-border-subtle">
 {last7DaysData.map((day, idx) => {
 const heightPercent = maxVolume > 0 ? Math.max((day.count / maxVolume) * 100, 4) : 4;
 return (
 <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
 <div className="w-full relative flex items-end justify-center h-full rounded-sm bg-bg-subtle/30 overflow-hidden">
 <div 
 className="w-full bg-primary-base rounded-sm transition-all group-hover:opacity-80" 
 style={{ height: `${heightPercent}%` }}
 title={`${day.count} sent`}
 ></div>
 </div>
 <span className="text-[10px] text-text-muted uppercase tracking-wider">{day.label}</span>
 </div>
 );
 })}
 </div>
 </Card>

 {/* Domain Health */}
 <Card className="skeu-card p-5 flex flex-col justify-between">
 <div>
 <h2 className="text-xs font-semibold tracking-widest text-text-muted uppercase mb-1">
 Domain Health
 </h2>
 <div className="flex items-baseline gap-2">
 <div className="text-2xl font-bold text-text-primary">{avgHealth}<span className="text-sm font-normal text-text-muted">/100</span></div>
 {avgHealth >= 90 ? (
 <span className="text-xs text-success-text font-medium">Healthy</span>
 ) : (
 <span className="text-xs text-warning-text font-medium">Needs Attention</span>
 )}
 </div>
 </div>
 
 <div className="space-y-3 mt-6 pt-4 border-t border-border-subtle">
 <div className="flex justify-between items-center text-sm">
 <span className="text-text-muted">Bounce Rate</span>
 <span className="font-medium text-text-primary">{bounceRateWeek}%</span>
 </div>
 <div className="flex justify-between items-center text-sm">
 <span className="text-text-muted">Active Accounts</span>
 <span className="font-medium text-text-primary">{readyCount}</span>
 </div>
 <div className="flex justify-between items-center text-sm">
 <span className="text-text-muted">Warming Up</span>
 <span className="font-medium text-text-primary">{warmingCount}</span>
 </div>
 </div>
 </Card>
 </div>

 {/* TWO-COLUMN GRID */}
 <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
 
 {/* LEFT COLUMN: ACTIVE CAMPAIGNS */}
 <div className="lg:col-span-3 space-y-4">
 <div className="flex justify-between items-center px-1">
 <h2 className="text-xs font-semibold tracking-widest text-text-muted uppercase">
 Active Campaigns
 </h2>
 <Link
 href="/campaigns"
 className="text-xs text-text-muted hover:text-text-primary transition-colors"
 >
 View all &rarr;
 </Link>
 </div>

 <Card className="skeu-card p-0 divide-y divide-border-subtle overflow-hidden">
 {activeCampaigns.length === 0 ? (
 <div className="p-8 text-center text-text-muted">
 <p>No campaigns currently sending.</p>
 </div>
 ) : (
 activeCampaigns.map((camp) => (
 <div key={camp.id} className="p-4 flex items-center justify-between hover:bg-bg-subtle/30 transition-colors">
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2 mb-1">
 <div className={`w-2 h-2 rounded-full ${camp.status === 'SENDING' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
 <h3 className="text-sm font-semibold text-text-primary truncate">{camp.name}</h3>
 </div>
 <div className="flex items-center gap-3">
 <div className="flex-1 max-w-[120px] skeu-progress-bar h-1.5">
 <div style={{ width: `${camp.progress}%` }}></div>
 </div>
 <span className="text-xs text-text-muted">{camp.sent} / {camp.total}</span>
 </div>
 </div>
 <Link href={`/campaigns/${camp.id}`} className="ml-4 px-3 py-1.5 rounded-md border border-border-subtle text-xs font-medium text-text-primary hover:bg-bg-subtle transition-colors shrink-0">
 Manage
 </Link>
 </div>
 ))
 )}
 </Card>
 </div>

 {/* RIGHT COLUMN: AUDIT LOG & QUICK LINKS */}
 <div className="lg:col-span-2 space-y-4">
 <div className="flex justify-between items-center px-1">
 <h2 className="text-xs font-semibold tracking-widest text-text-muted uppercase">
 Needs Attention
 </h2>
 </div>
 <Card className="skeu-card p-0 divide-y divide-border-subtle overflow-hidden">
 {topFeed.length === 0 ? (
 <div className="p-6 text-center text-text-muted text-sm">
 <p>All caught up!</p>
 </div>
 ) : (
 topFeed.map((item, idx) => (
 <Link
 href={item.link}
 key={idx}
 className="flex items-start gap-3 py-3 px-4 hover:bg-bg-subtle/50 transition-colors block cursor-pointer"
 >
 <div
 className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
 item.type === "draft"
 ? "bg-bg-subtle text-text-muted"
 : "bg-danger-bg text-danger-text"
 }`}
 >
 {item.initial}
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-xs text-text-primary truncate">
 {item.title}
 </p>
 <p className="text-[10px] text-text-muted truncate">
 {item.subtitle}
 </p>
 </div>
 <span className="text-[10px] text-text-muted shrink-0">
 {timeAgo(item.date)}
 </span>
 </Link>
 ))
 )}
 </Card>
 
 {/* Quick Links */}
 <Card className="skeu-card p-2 border-none">
 <div className="flex flex-col">
 <Link
 href="/accounts"
 className="skeu-nav-item border-b border-border-subtle last:border-0 py-2.5 rounded-none bg-transparent hover:bg-bg-subtle"
 >
 <Users size={14} />
 <span className="text-sm">Accounts</span>
 <span className="text-text-muted ml-auto">&rarr;</span>
 </Link>
 <Link
 href="/settings"
 className="skeu-nav-item border-b border-border-subtle last:border-0 py-2.5 rounded-none bg-transparent hover:bg-bg-subtle"
 >
 <Settings size={14} />
 <span className="text-sm">Settings</span>
 <span className="text-text-muted ml-auto">&rarr;</span>
 </Link>
 </div>
 </Card>

 </div>
 </div>
 </div>
 </div>
 );
}
