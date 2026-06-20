import { Inbox, Users, BarChart2, Settings } from "lucide-react";
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
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  // Fetch Data
  const [
    accounts,
    campaigns,
    eventsToday,
    eventsLast7Days,
    eventsPrev7Days,
    unreadReplies,
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
      where: { campaign: { userId: user.id }, occurredAt: { gte: startOfDay } },
    }),
    prisma.mailEvent.findMany({
      where: {
        campaign: { userId: user.id },
        occurredAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.mailEvent.findMany({
      where: {
        campaign: { userId: user.id },
        occurredAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
    }),
    prisma.reply.findMany({
      where: { campaign: { userId: user.id }, isRead: false },
      include: { campaign: true, recipient: true },
      orderBy: { receivedAt: "desc" },
    }),
    prisma.recipient.findMany({
      where: { campaign: { userId: user.id } },
      include: { mailEvents: true, campaign: true, replies: true },
    }),
  ]);

  // --- STAT CALCULATIONS ---

  // Sent Today
  const sentToday = eventsToday.filter((e) => e.type === "SENT").length;
  const totalDailyLimit = accounts.reduce((acc, account) => {
    const defaultLimit = account.provider === "google" ? 50 : 200;
    return acc + Math.min(defaultLimit, account.warmupDay * 25);
  }, 0);
  const dailyLimitPercent =
    totalDailyLimit > 0 ? Math.round((sentToday / totalDailyLimit) * 100) : 0;

  // All-time rates
  const sentRecipientIds = new Set(
    recipients
      .filter(
        (r) =>
          r.status === "SENT" ||
          r.status === "BOUNCED" ||
          r.status === "FAILED",
      )
      .map((r) => r.id),
  );
  const totalSentRecipients = sentRecipientIds.size;
  const openedRecipientIds = new Set(
    recipients
      .filter((r) => r.mailEvents.some((e) => e.type === "OPENED"))
      .map((r) => r.id),
  );
  const openRate =
    totalSentRecipients > 0
      ? Math.round((openedRecipientIds.size / totalSentRecipients) * 100)
      : 0;

  const repliedRecipientIds = new Set(
    recipients.filter((r) => r.replies.length > 0).map((r) => r.id),
  );
  const replyRateNum =
    totalSentRecipients > 0
      ? (repliedRecipientIds.size / totalSentRecipients) * 100
      : 0;
  const replyRate = replyRateNum.toFixed(1);

  // Open Rate Jump
  const sentThisWeek = new Set(
    eventsLast7Days.filter((e) => e.type === "SENT").map((e) => e.recipientId),
  );
  const openedThisWeek = new Set(
    eventsLast7Days
      .filter((e) => e.type === "OPENED")
      .map((e) => e.recipientId),
  );
  const openRateThisWeek =
    sentThisWeek.size > 0
      ? Math.round((openedThisWeek.size / sentThisWeek.size) * 100)
      : 0;

  const sentPrevWeek = new Set(
    eventsPrev7Days.filter((e) => e.type === "SENT").map((e) => e.recipientId),
  );
  const openedPrevWeek = new Set(
    eventsPrev7Days
      .filter((e) => e.type === "OPENED")
      .map((e) => e.recipientId),
  );
  const openRatePrevWeek =
    sentPrevWeek.size > 0
      ? Math.round((openedPrevWeek.size / sentPrevWeek.size) * 100)
      : 0;

  const openRateJump = openRateThisWeek - openRatePrevWeek;

  // Warm Leads
  const warmRecipients = recipients.filter((r) => {
    if (r.replies.length > 0) return false;
    const openCount = r.mailEvents.filter((e) => e.type === "OPENED").length;
    return openCount >= 2;
  });
  const warmLeadsCount = warmRecipients.length;

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentWarmRecipients = warmRecipients.filter((r) => {
    const lastOpen = r.mailEvents
      .filter((e) => e.type === "OPENED")
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];
    return lastOpen && lastOpen.occurredAt > yesterday;
  });

  // --- FEED GENERATION ---
  const feedItems: {
    type: "reply" | "warm" | "draft" | "fix";
    title: string;
    subtitle: string;
    date: Date;
    initial: string;
    link: string;
  }[] = [];

  for (const reply of unreadReplies) {
    feedItems.push({
      type: "reply",
      title: reply.fromEmail || "Unknown Sender",
      subtitle: `${reply.campaign.name} · "${reply.body.substring(0, 40)}..."`,
      date: reply.receivedAt,
      initial: (reply.fromEmail || "U").charAt(0).toUpperCase(),
      link: "/inbox",
    });
  }

  for (const r of recentWarmRecipients) {
    const lastOpen = r.mailEvents
      .filter((e) => e.type === "OPENED")
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];
    feedItems.push({
      type: "warm",
      title: String(
        (r.dynamicData as Record<string, unknown>)?.firstName || r.email,
      ),
      subtitle: `${r.campaign.name} · Opened multiple times recently`,
      date: lastOpen.occurredAt,
      initial: String(
        (r.dynamicData as Record<string, unknown>)?.firstName || r.email,
      )
        .charAt(0)
        .toUpperCase(),
      link: `/campaigns/${r.campaign.id}`,
    });
  }

  const drafts = campaigns.filter((c) => c.status === "DRAFT");
  for (const draft of drafts) {
    feedItems.push({
      type: "draft",
      title: `Draft: ${draft.name}`,
      subtitle: `${draft._count.recipients} recipients ready to send`,
      date: draft.updatedAt,
      initial: "D",
      link: `/campaigns/${draft.id}`,
    });
  }

  const failedRecipients = recipients.filter(
    (r) => r.status === "FAILED" || r.status === "BOUNCED",
  );
  const recentFailed = failedRecipients.filter(
    (r) => r.createdAt > sevenDaysAgo,
  );
  for (const r of recentFailed) {
    feedItems.push({
      type: "fix",
      title: `Delivery Issue: ${r.email}`,
      subtitle: `${r.campaign.name} · ${r.failReason || "Bounced"}`,
      date: r.sentAt || r.createdAt,
      initial: r.email.charAt(0).toUpperCase(),
      link: `/campaigns/${r.campaign.id}`,
    });
  }

  feedItems.sort((a, b) => b.date.getTime() - a.date.getTime());
  const topFeed = feedItems.slice(0, 6);

  // --- CAMPAIGN PERFORMANCE ---
  const campaignPerformance = campaigns
    .filter((c) => c.status !== "DRAFT")
    .map((c) => {
      const campRecipients = recipients.filter((r) => r.campaignId === c.id);
      const sent = campRecipients.filter(
        (r) =>
          r.status === "SENT" ||
          r.status === "BOUNCED" ||
          r.status === "FAILED",
      ).length;
      const opened = campRecipients.filter((r) =>
        r.mailEvents.some((e) => e.type === "OPENED"),
      ).length;
      const rate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
      return {
        id: c.id,
        name: c.name,
        openRate: rate,
        sent,
      };
    })
    .sort((a, b) => b.sent - a.sent)
    .slice(0, 4);

  const formatter = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const dateString = formatter.format(now);

  return (
    <div className="skeu-page">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              Good morning, {firstName}
            </h1>
            <p className="text-sm text-text-muted">{dateString}</p>
          </div>
          <Link href="/campaigns/new" className="skeu-btn-primary">
            + New campaign
          </Link>
        </div>

        {/* SECTION 1 - SIGNAL BAR */}
        <div className="bg-primary-base text-primary-text px-6 py-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="animate-pulse w-2 h-2 rounded-full bg-emerald-400 shrink-0"></div>
            <div className="text-sm md:text-base">
              {openRateJump > 0 ? (
                <span className="font-bold">
                  Your open rate jumped {openRateJump}pts this week.{" "}
                </span>
              ) : openRateJump < 0 ? (
                <span className="font-bold">
                  Your open rate dropped {Math.abs(openRateJump)}pts this
                  week.{" "}
                </span>
              ) : (
                <span className="font-bold">
                  Your open rate is holding steady at {openRate}%.{" "}
                </span>
              )}

              <span className="opacity-80">
                {recentWarmRecipients.length > 0
                  ? `${recentWarmRecipients.length} warm accounts opened but never replied — follow up now.`
                  : "No urgent warm leads right now. Keep sending!"}
              </span>
            </div>
          </div>
          <Link
            href="/inbox"
            className="border border-primary-text text-primary-text rounded-md px-4 py-2 text-sm font-medium hover:bg-primary-text/10 hover:opacity-80 transition-all whitespace-nowrap shrink-0"
          >
            Follow up now &rarr;
          </Link>
        </div>

        {/* SECTION 2 - STAT ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="skeu-stat-card flex flex-col justify-center">
            <div className="label">SENT TODAY</div>
            <div className="value">{sentToday}</div>
            <div className="sub text-text-muted">
              {dailyLimitPercent}% of daily limit
            </div>
          </Card>
          <Card className="skeu-stat-card flex flex-col justify-center">
            <div className="label">OPEN RATE</div>
            <div className="value">{openRate}%</div>
            <div
              className={
                openRateJump >= 0
                  ? "sub text-emerald-500"
                  : "sub text-amber-500"
              }
            >
              {openRateJump >= 0 ? "&uarr;" : "&darr;"} {Math.abs(openRateJump)}
              pts vs last week
            </div>
          </Card>
          <Card className="skeu-stat-card flex flex-col justify-center">
            <div className="label">REPLY RATE</div>
            <div className="value">{replyRate}%</div>
            <div
              className={
                replyRateNum >= 10
                  ? "sub text-emerald-500 flex justify-center items-center gap-1"
                  : "sub text-amber-500 flex justify-center items-center gap-1"
              }
            >
              {replyRateNum < 10 && <span>&#9888;</span>}{" "}
              {replyRateNum >= 10 ? "Above 10% target" : "Below 10% target"}
            </div>
          </Card>
          <Card className="skeu-stat-card flex flex-col justify-center">
            <div className="label">WARM LEADS</div>
            <div className="value">{warmLeadsCount}</div>
            <div className="sub text-emerald-500">
              {recentWarmRecipients.length} need response today
            </div>
          </Card>
        </div>

        {/* SECTION 3 - TWO-COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* LEFT COLUMN (ratio 3) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xs font-semibold tracking-widest text-text-muted uppercase">
                NEEDS YOUR ATTENTION
              </h2>
              <Link
                href="/campaigns"
                className="text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                All activity &rarr;
              </Link>
            </div>

            <Card className="skeu-card p-0 divide-y divide-border-subtle overflow-hidden">
              {topFeed.length === 0 ? (
                <div className="p-8 text-center text-text-muted">
                  <p>All caught up! No urgent items.</p>
                </div>
              ) : (
                topFeed.map((item, idx) => (
                  <Link
                    href={item.link}
                    key={idx}
                    className="flex items-start gap-3 py-3 px-4 hover:bg-bg-subtle/50 transition-colors block cursor-pointer"
                  >
                    <div
                      className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-sm shrink-0 ${
                        item.type === "reply"
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700"
                          : item.type === "warm"
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700"
                            : item.type === "draft"
                              ? "bg-bg-subtle text-text-muted"
                              : "bg-danger-bg text-danger-text"
                      }`}
                    >
                      {item.initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-text-primary truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {item.subtitle}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-text-muted">
                        {timeAgo(item.date)}
                      </span>
                      {item.type === "reply" && (
                        <span className="skeu-badge skeu-badge-replied">
                          Reply
                        </span>
                      )}
                      {item.type === "warm" && (
                        <span className="skeu-badge bg-amber-100 text-amber-700 border-transparent dark:bg-amber-900/30">
                          Warm
                        </span>
                      )}
                      {item.type === "draft" && (
                        <span className="skeu-badge skeu-badge-draft">
                          Draft
                        </span>
                      )}
                      {item.type === "fix" && (
                        <span className="skeu-badge skeu-badge-failed">
                          Fix
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </Card>
          </div>

          {/* RIGHT COLUMN (ratio 2) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Top Right */}
            <Card className="skeu-card">
              <div className="mb-4">
                <h2 className="text-xs font-semibold tracking-widest text-text-muted uppercase">
                  CAMPAIGN PERFORMANCE
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  All time &middot; open rate
                </p>
              </div>
              <div className="space-y-1">
                {campaignPerformance.length === 0 ? (
                  <p className="text-sm text-text-muted py-2">
                    No active campaigns yet.
                  </p>
                ) : (
                  campaignPerformance.map((cp) => (
                    <div key={cp.id} className="flex items-center gap-3 py-2">
                      <div
                        className="text-sm text-text-primary font-medium w-20 shrink-0 truncate"
                        title={cp.name}
                      >
                        {cp.name}
                      </div>
                      <div className="flex-1 skeu-progress-bar">
                        <div style={{ width: `${cp.openRate}%` }}></div>
                      </div>
                      <div className="text-sm font-semibold text-text-primary w-10 text-right">
                        {cp.openRate}%
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Bottom Right */}
            <Card className="skeu-card p-4 border-none  -none">
              <div className="flex flex-col">
                <Link
                  href="/inbox"
                  className="skeu-nav-item border-b border-border-subtle last:border-0 py-3 rounded-none bg-transparent hover:bg-bg-subtle"
                >
                  <Inbox size={16} />
                  <span>Inbox</span>
                  {unreadReplies.length > 0 && (
                    <span className="bg-primary-base text-primary-text rounded-full px-1.5 py-0.5 text-[10px] ml-1 font-bold leading-none flex items-center justify-center">
                      {unreadReplies.length}
                    </span>
                  )}
                  <span className="text-text-muted ml-auto">&rarr;</span>
                </Link>
                <Link
                  href="/accounts"
                  className="skeu-nav-item border-b border-border-subtle last:border-0 py-3 rounded-none bg-transparent hover:bg-bg-subtle"
                >
                  <Users size={16} />
                  <span>Accounts</span>
                  <span className="text-text-muted ml-auto">&rarr;</span>
                </Link>
                <Link
                  href="/analytics"
                  className="skeu-nav-item border-b border-border-subtle last:border-0 py-3 rounded-none bg-transparent hover:bg-bg-subtle"
                >
                  <BarChart2 size={16} />
                  <span>Analytics</span>
                  <span className="text-text-muted ml-auto">&rarr;</span>
                </Link>
                <Link
                  href="/settings"
                  className="skeu-nav-item border-b border-border-subtle last:border-0 py-3 rounded-none bg-transparent hover:bg-bg-subtle"
                >
                  <Settings size={16} />
                  <span>Settings</span>
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
