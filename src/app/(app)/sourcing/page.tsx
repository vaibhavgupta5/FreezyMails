import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";
import { followUpsHash, type FollowUp } from "@/lib/agent";
import ApproveFollowUps from "./_components/ApproveFollowUps";

export default async function SourcingPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const [clusters, companies, jobs] = await Promise.all([
    prisma.cluster.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, include: { _count: { select: { jobs: { where: { closedAt: null } } } } } }),
    prisma.company.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 60, include: { _count: { select: { jobs: { where: { closedAt: null } }, contacts: true } } } }),
    prisma.jobPosting.findMany({
      where: { userId: user.id, closedAt: null, status: { in: ["NEW", "SHORTLISTED"] } },
      orderBy: [{ score: "desc" }, { firstSeenAt: "desc" }],
      take: 25,
      include: { company: { select: { name: true } }, cluster: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="skeu-page">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Sourcing</h1>
          <p className="text-sm text-text-muted mt-1">Clusters, tracked companies and the best-scoring open roles. Claude Code manages these through the MCP tools; you review them here.</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Clusters</h2>
          {clusters.length === 0 && <p className="text-sm text-text-muted">No clusters yet. Ask Claude Code to run /fm-hunt.</p>}
          {clusters.map((c) => {
            const fu = (c.followUps as unknown as FollowUp[]) ?? [];
            const approved = fu.length > 0 && c.followUpsApprovedHash === followUpsHash(fu);
            return (
              <div key={c.id} className="skeu-card space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{c.name} <span className="text-xs text-text-muted">{c._count.jobs} open roles{c.isActive ? "" : " · inactive"}</span></p>
                </div>
                <p className="text-xs text-text-muted">Title keywords: {c.titleKeywords.join(", ")}{c.excludeKeywords.length ? ` · excludes: ${c.excludeKeywords.join(", ")}` : ""}</p>
                {fu.length > 0 && (
                  <div className="space-y-2 border-t border-border pt-2">
                    <p className="text-xs font-medium">Follow-ups {approved ? "(approved, active)" : "(waiting for your approval, not sent)"}</p>
                    {fu.map((f, i) => (
                      <div key={i} className="text-xs text-text-muted">
                        <p>After {f.delayDays} days: <span className="font-medium text-text-primary">{f.subject}</span></p>
                        <p className="whitespace-pre-wrap">{f.body}</p>
                      </div>
                    ))}
                    {!approved && <ApproveFollowUps clusterId={c.id} />}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Top open roles</h2>
          <div className="skeu-card !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-text-muted"><th className="p-3">Score</th><th className="p-3">Role</th><th className="p-3">Company</th><th className="p-3">Cluster</th><th className="p-3">Status</th></tr></thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-t border-border">
                    <td className="p-3">{j.score}</td>
                    <td className="p-3"><a className="underline" href={j.url} target="_blank" rel="noreferrer">{j.title}</a>{j.location ? <span className="text-xs text-text-muted"> · {j.location}</span> : null}</td>
                    <td className="p-3">{j.company.name}</td>
                    <td className="p-3">{j.cluster?.name ?? ""}</td>
                    <td className="p-3">{j.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Companies ({companies.length})</h2>
          <div className="skeu-card !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-text-muted"><th className="p-3">Company</th><th className="p-3">Board</th><th className="p-3">Open roles</th><th className="p-3">Contacts</th><th className="p-3">Last synced</th></tr></thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="p-3">{c.name}</td>
                    <td className="p-3 text-text-muted">{c.atsKind ? `${c.atsKind}:${c.atsSlug}` : c.source}</td>
                    <td className="p-3">{c._count.jobs}</td>
                    <td className="p-3">{c._count.contacts}</td>
                    <td className="p-3 text-text-muted">{c.lastSyncedAt ? c.lastSyncedAt.toLocaleString() : "never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
