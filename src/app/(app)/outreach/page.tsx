import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";
import { getAgentState, reconcile } from "@/lib/agent";
import OutreachQueue from "./_components/OutreachQueue";

export default async function OutreachPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await reconcile(user.id);
  const [rows, state] = await Promise.all([
    prisma.outreach.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
      include: { company: { select: { name: true } }, job: { select: { title: true } } },
    }),
    getAgentState(user.id),
  ]);
  const order = { DRAFT: 0, APPROVED: 1, QUEUED: 2, SENT: 3, FAILED: 4, REJECTED: 5 } as Record<string, number>;
  rows.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

  return (
    <div className="skeu-page">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Approvals</h1>
          <p className="text-sm text-text-muted mt-1">
            Claude writes drafts; nothing is sent until you approve it here. Daily cap {state.dailyCap}, with random 2.5 to 7 minute gaps.
            {state.paused ? " The agent is paused." : ""}
          </p>
        </div>
        <OutreachQueue
          draftCount={rows.filter((r) => r.status === "DRAFT").length}
          approvedCount={rows.filter((r) => r.status === "APPROVED").length}
          rows={rows.map((r) => ({ id: r.id, status: r.status, toEmail: r.toEmail, subject: r.subject, body: r.body, company: r.company.name, role: r.job?.title ?? null, sourceUrl: r.sourceUrl }))}
        />
      </div>
    </div>
  );
}
