import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getUser } from "@/lib/supabase";
import { getAgentState } from "@/lib/agent";
import AgentControls from "./_components/AgentControls";

export default async function AgentPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const [state, logs, keys] = await Promise.all([
    getAgentState(user.id),
    prisma.auditLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.apiKey.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
  ]);
  const keyName = new Map(keys.map((k) => [k.id, k.name]));

  return (
    <div className="skeu-page">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Agent</h1>
          <p className="text-sm text-text-muted mt-1">Control what Claude Code can do, and see every tool call it made.</p>
        </div>
        <AgentControls paused={state.paused} dailyCap={state.dailyCap} />
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Recent tool calls</h2>
          <div className="skeu-card !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-text-muted"><th className="p-3">When</th><th className="p-3">Tool</th><th className="p-3">Key</th><th className="p-3">Arguments</th></tr></thead>
              <tbody>
                {logs.length === 0 && <tr><td className="p-3 text-text-muted" colSpan={4}>No calls yet.</td></tr>}
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-border align-top">
                    <td className="p-3 whitespace-nowrap text-text-muted">{l.createdAt.toLocaleString()}</td>
                    <td className="p-3 whitespace-nowrap">{l.tool}{l.isError ? " (error)" : ""}</td>
                    <td className="p-3 text-text-muted">{(l.keyId && keyName.get(l.keyId)) || "revoked key"}</td>
                    <td className="p-3 text-xs text-text-muted break-all">{l.summary}</td>
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
