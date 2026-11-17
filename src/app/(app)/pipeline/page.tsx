import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";
import { reconcile } from "@/lib/agent";
import StatusSelect from "./_components/StatusSelect";

const COLUMNS = ["APPLIED", "REPLIED", "INTERVIEW", "OFFER", "REJECTED", "GHOSTED", "WITHDRAWN"] as const;

export default async function PipelinePage() {
  const user = await getUser();
  if (!user) redirect("/login");
  await reconcile(user.id);
  const apps = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { lastEventAt: "desc" },
    take: 300,
    include: { company: { select: { name: true } }, cluster: { select: { name: true } } },
  });
  const due = await prisma.application.findMany({
    where: { userId: user.id, status: { in: ["APPLIED", "REPLIED"] }, followUpAt: { lte: new Date() } },
    include: { company: { select: { name: true } } },
    take: 10,
  });

  return (
    <div className="skeu-page">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Pipeline</h1>
          <p className="text-sm text-text-muted mt-1">
            Everywhere you applied: emails sent by FreezyMails and ATS applications Claude Code logged. Applications with no news for 30 days move to Ghosted.
          </p>
        </div>

        {due.length > 0 && (
          <div className="skeu-card">
            <h2 className="text-sm font-semibold mb-2">Follow-ups due ({due.length})</h2>
            <ul className="text-sm space-y-1">
              {due.slice(0, 10).map((a) => (
                <li key={a.id}>{a.company.name}{a.roleTitle ? ` · ${a.roleTitle}` : ""} <span className="text-text-muted">applied {a.appliedAt.toLocaleDateString()}</span></li>
              ))}
            </ul>
          </div>
        )}

        {apps.length === 0 && <p className="text-sm text-text-muted">No applications yet.</p>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.filter((c) => apps.some((a) => a.status === c) || ["APPLIED", "REPLIED", "INTERVIEW", "OFFER"].includes(c)).map((col) => {
            const items = apps.filter((a) => a.status === col);
            return (
              <div key={col} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{col} ({items.length})</h2>
                {items.map((a) => (
                  <div key={a.id} className="skeu-card !p-3 space-y-2">
                    <p className="text-sm font-medium leading-tight">{a.company.name}</p>
                    {a.roleTitle && <p className="text-xs text-text-muted">{a.roleTitle}</p>}
                    <p className="text-xs text-text-muted">
                      {a.channel}{a.atsKind ? ` · ${a.atsKind}` : ""}{a.cluster ? ` · ${a.cluster.name}` : ""}{a.verified ? " · verified" : " · unverified"}
                    </p>
                    {a.url && <a className="text-xs underline" href={a.url} target="_blank" rel="noreferrer">Listing</a>}
                    <StatusSelect id={a.id} status={a.status} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
