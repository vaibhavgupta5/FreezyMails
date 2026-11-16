"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Doc {
  id: string;
  kind: string;
  name: string;
  sizeBytes: number;
  isDefault: boolean;
  textLength: number;
}
interface Fact {
  id: string;
  text: string;
  kind: string;
  status: string;
  sourceUrl: string | null;
  proposedBy: string;
}
interface Profile {
  headline: string | null;
  location: string | null;
  workAuth: string | null;
  gradYear: number | null;
  salaryFloor: string | null;
  roleTypes: string[];
  targetRoles: string[];
  excludedCompanies: string[];
  excludedKeywords: string[];
  links: { linkedin?: string; portfolio?: string; x?: string };
  githubUsername: string | null;
  setupCompletedAt: string | null;
}
interface GithubData {
  username: string;
  externalMergedPrs: { total: number; byRepo: { repo: string; count: number }[] };
  topRepos: { name: string }[];
  languages: { language: string }[];
}
interface Payload {
  profile: Profile;
  documents: Doc[];
  facts: Fact[];
  github: { data: GithubData; fetchedAt: string } | null;
  status: { complete: boolean; missing: string[]; steps: Record<string, boolean> };
}

const csv = (s: string) =>
  s.split(",").map((x) => x.trim()).filter(Boolean);

const STEPS = ["Basics", "Documents", "GitHub", "Facts", "Finish"] as const;

export default function SetupWizard() {
  const [data, setData] = useState<Payload | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/profile");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && d && setData(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!data) return <div className="skeu-card text-sm text-text-muted">Loading…</div>;

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
    setBusy(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors cursor-pointer ${
              i === step
                ? "bg-bg-subtle border-border font-medium"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            {i + 1}. {s}
          </button>
        ))}
        <span className="ml-auto text-sm self-center">
          {data.status.complete ? "Setup complete" : "Setup incomplete"}
        </span>
      </div>

      {step === 0 && <Basics data={data} busy={busy} run={run} reload={reload} next={() => setStep(1)} />}
      {step === 1 && <Documents data={data} busy={busy} run={run} reload={reload} next={() => setStep(2)} />}
      {step === 2 && <Github data={data} busy={busy} run={run} reload={reload} next={() => setStep(3)} />}
      {step === 3 && <Facts data={data} busy={busy} run={run} reload={reload} next={() => setStep(4)} />}
      {step === 4 && <Finish data={data} busy={busy} run={run} reload={reload} />}
    </div>
  );
}

interface StepProps {
  data: Payload;
  busy: string | null;
  run: (label: string, fn: () => Promise<void>) => Promise<void>;
  reload: () => Promise<void>;
  next?: () => void;
}

function Basics({ data, busy, run, reload, next }: StepProps) {
  const p = data.profile;
  const [f, setF] = useState({
    headline: p.headline ?? "",
    location: p.location ?? "",
    workAuth: p.workAuth ?? "",
    gradYear: p.gradYear ? String(p.gradYear) : "",
    salaryFloor: p.salaryFloor ?? "",
    roleTypes: p.roleTypes.join(", "),
    targetRoles: p.targetRoles.join(", "),
    excludedCompanies: p.excludedCompanies.join(", "),
    excludedKeywords: p.excludedKeywords.join(", "),
    linkedin: p.links.linkedin ?? "",
    portfolio: p.links.portfolio ?? "",
    x: p.links.x ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const save = () =>
    run("basics", async () => {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: f.headline || null,
          location: f.location || null,
          workAuth: f.workAuth || null,
          gradYear: f.gradYear ? Number(f.gradYear) : null,
          salaryFloor: f.salaryFloor || null,
          roleTypes: csv(f.roleTypes),
          targetRoles: csv(f.targetRoles),
          excludedCompanies: csv(f.excludedCompanies),
          excludedKeywords: csv(f.excludedKeywords),
          links: { linkedin: f.linkedin, portfolio: f.portfolio, x: f.x },
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Failed to save");
      toast.success("Saved");
      await reload();
      next?.();
    });

  const field = (label: string, k: keyof typeof f, placeholder = "", hint = "") => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <Input className="skeu-input" value={f[k]} onChange={set(k)} placeholder={placeholder} />
      {hint && <p className="text-xs text-text-muted mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="skeu-card space-y-4">
      <h2 className="text-lg font-semibold">About you and what you want</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {field("Headline", "headline", "Backend engineer, compilers and systems")}
        {field("Location", "location", "Bengaluru, India", "Required")}
        {field("Work authorization", "workAuth", "Authorized in India; need sponsorship for US")}
        {field("Graduation year", "gradYear", "2027", "Decides which internship and new-grad roles you qualify for")}
        {field("Salary or stipend floor", "salaryFloor", "INR 30k/month")}
        {field("Role types", "roleTypes", "internship, full-time", "Comma separated")}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {field("Target roles", "targetRoles", "AI engineer, SDE, backend", "Comma separated. At least one is required. Used to propose clusters.")}
        {field("Never contact these companies", "excludedCompanies", "Acme, Globex", "Comma separated")}
        {field("Exclude keywords", "excludedKeywords", "unpaid, sales, telecaller", "Comma separated")}
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {field("LinkedIn", "linkedin", "https://linkedin.com/in/…")}
        {field("Portfolio", "portfolio", "https://…")}
        {field("X profile", "x", "https://x.com/…")}
      </div>
      <Button variant="primary" onClick={save} isLoading={busy === "basics"}>
        Save and continue
      </Button>
    </div>
  );
}

function Documents({ data, busy, run, reload, next }: StepProps) {
  const [kind, setKind] = useState("RESUME");
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  const upload = (file: File | null) =>
    run("upload", async () => {
      const fd = new FormData();
      fd.set("kind", kind);
      if (name) fd.set("name", name);
      if (file) fd.set("file", file);
      else fd.set("text", text);
      const res = await fetch("/api/profile/documents", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Upload failed");
      setWarnings(d.warnings ?? []);
      setText("");
      setName("");
      toast.success(`Saved ${d.name}`);
      await reload();
    });

  const remove = (id: string) =>
    run("del", async () => {
      await fetch(`/api/profile/documents/${id}`, { method: "DELETE" });
      await reload();
    });

  const makeDefault = (id: string) =>
    run("default", async () => {
      await fetch(`/api/profile/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      await reload();
    });

  return (
    <div className="skeu-card space-y-4">
      <h2 className="text-lg font-semibold">Resumes and cover letters</h2>
      <p className="text-sm text-text-muted">
        Upload every resume variant you use (for example AI and backend). PDF,
        DOCX, TXT or MD, up to 5 MB. Text is extracted so drafts and forms can
        use it.
      </p>

      <div className="grid sm:grid-cols-3 gap-3 max-w-2xl">
        <select
          className="skeu-select h-10 rounded-md px-3 text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="RESUME">Resume</option>
          <option value="COVER_LETTER">Cover letter</option>
          <option value="OTHER">Other writing sample</option>
        </select>
        <Input
          className="skeu-input sm:col-span-2"
          placeholder="Label, e.g. Resume - AI"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <input
        type="file"
        accept=".pdf,.docx,.txt,.md"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          if (file) upload(file);
          e.target.value = "";
        }}
        className="text-sm"
        disabled={busy === "upload"}
      />

      <details>
        <summary className="text-sm cursor-pointer text-text-muted">Or paste text</summary>
        <div className="mt-2 space-y-2">
          <Textarea
            className="skeu-input min-h-32"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a cover letter or resume text"
          />
          <Button variant="primary" size="sm" onClick={() => upload(null)} disabled={!text.trim()} isLoading={busy === "upload"}>
            Save pasted text
          </Button>
        </div>
      </details>

      {warnings.map((w) => (
        <p key={w} className="text-sm text-danger-text bg-danger-bg rounded-md p-3">
          {w}
        </p>
      ))}

      <ul className="divide-y divide-border">
        {data.documents.length === 0 && <li className="py-2 text-sm text-text-muted">Nothing uploaded yet.</li>}
        {data.documents.map((d) => (
          <li key={d.id} className="py-2 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {d.name} {d.isDefault && <span className="text-xs text-text-muted">(default {d.kind.toLowerCase().replace("_", " ")})</span>}
              </p>
              <p className="text-xs text-text-muted">
                {d.kind.toLowerCase().replace("_", " ")} · {(d.sizeBytes / 1024).toFixed(0)} KB · {d.textLength} characters read
              </p>
            </div>
            {!d.isDefault && (
              <Button variant="ghost" size="sm" onClick={() => makeDefault(d.id)}>
                Make default
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={() => remove(d.id)}>
              Delete
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="primary" onClick={next}>
        Continue
      </Button>
    </div>
  );
}

function Github({ data, busy, run, reload, next }: StepProps) {
  const [username, setUsername] = useState(data.profile.githubUsername ?? "");
  const g = data.github?.data;

  const fetchIt = () =>
    run("github", async () => {
      const res = await fetch("/api/profile/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "GitHub fetch failed");
      toast.success("GitHub imported");
      await reload();
    });

  return (
    <div className="skeu-card space-y-4">
      <h2 className="text-lg font-semibold">GitHub (optional)</h2>
      <p className="text-sm text-text-muted">
        We count merged pull requests to repositories you do not own. That is
        the number worth citing. Your profile headline count often includes
        commits to your own repos, so it is not used.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 max-w-md">
        <Input className="skeu-input" placeholder="github username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Button variant="primary" className="whitespace-nowrap" onClick={fetchIt} isLoading={busy === "github"} disabled={!username.trim()}>
          {g ? "Refresh" : "Import"}
        </Button>
      </div>

      {g && (
        <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
          <p>
            <strong>{g.externalMergedPrs.total}</strong> merged PRs to other people&apos;s repos
          </p>
          <p className="text-text-muted">
            {g.externalMergedPrs.byRepo.slice(0, 6).map((r) => `${r.repo} (${r.count})`).join(", ") || "None found"}
          </p>
          <p className="text-text-muted">
            Languages: {g.languages.map((l) => l.language).join(", ") || "n/a"} · {g.topRepos.length} top repos saved
          </p>
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="primary" onClick={next}>
          {g ? "Continue" : "Skip for now"}
        </Button>
      </div>
    </div>
  );
}

function Facts({ data, busy, run, reload, next }: StepProps) {
  const [newFact, setNewFact] = useState("");
  const proposed = data.facts.filter((f) => f.status === "PROPOSED");
  const approved = data.facts.filter((f) => f.status === "APPROVED");

  const extract = () =>
    run("extract", async () => {
      const res = await fetch("/api/profile/facts/extract", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Extraction failed");
      if (d.errors?.length) toast.error(d.errors[0]);
      toast.success(`${d.added} facts proposed`);
      await reload();
    });

  const setStatus = (ids: string[], status: string) =>
    run("status", async () => {
      if (ids.length === 0) return;
      await fetch("/api/profile/facts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      await reload();
    });

  const add = () =>
    run("add", async () => {
      const res = await fetch("/api/profile/facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newFact, kind: "OTHER" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Failed to add");
      setNewFact("");
      await reload();
    });

  const remove = (id: string) =>
    run("remove", async () => {
      await fetch(`/api/profile/facts/${id}`, { method: "DELETE" });
      await reload();
    });

  return (
    <div className="skeu-card space-y-4">
      <h2 className="text-lg font-semibold">Review your facts</h2>
      <p className="text-sm text-text-muted">
        Emails and application answers may only quote approved facts. Remove
        anything wrong or that you do not want repeated.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={extract} isLoading={busy === "extract"}>
          Extract from my documents and GitHub
        </Button>
        {proposed.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setStatus(proposed.map((f) => f.id), "APPROVED")}>
            Approve all {proposed.length} proposed
          </Button>
        )}
      </div>

      {proposed.length > 0 && (
        <FactList title="Proposed" facts={proposed} onApprove={(id) => setStatus([id], "APPROVED")} onReject={(id) => setStatus([id], "REJECTED")} onRemove={remove} />
      )}
      <FactList title="Approved" facts={approved} onRemove={remove} />

      <div className="flex gap-2 max-w-xl">
        <Input className="skeu-input" placeholder="Add a fact yourself" value={newFact} onChange={(e) => setNewFact(e.target.value)} />
        <Button variant="ghost" onClick={add} disabled={newFact.trim().length < 5}>
          Add
        </Button>
      </div>
      <Button variant="primary" onClick={next}>
        Continue
      </Button>
    </div>
  );
}

function FactList({
  title,
  facts,
  onApprove,
  onReject,
  onRemove,
}: {
  title: string;
  facts: Fact[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-1">
        {title} ({facts.length})
      </h3>
      {facts.length === 0 ? (
        <p className="text-sm text-text-muted">None yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {facts.map((f) => (
            <li key={f.id} className="py-2 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm">{f.text}</p>
                <p className="text-xs text-text-muted">
                  {f.kind.toLowerCase()} · {f.proposedBy}
                  {f.sourceUrl && (
                    <>
                      {" · "}
                      <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                        source
                      </a>
                    </>
                  )}
                </p>
              </div>
              {onApprove && (
                <Button variant="ghost" size="sm" onClick={() => onApprove(f.id)}>
                  Approve
                </Button>
              )}
              {onReject && (
                <Button variant="ghost" size="sm" onClick={() => onReject(f.id)}>
                  Reject
                </Button>
              )}
              <Button variant="danger" size="sm" onClick={() => onRemove(f.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Finish({ data, busy, run, reload }: StepProps) {
  const s = data.status;
  const finish = () =>
    run("finish", async () => {
      const res = await fetch("/api/profile/complete", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d.missing && d.missing.join("; ")) || d.error || "Setup is incomplete");
      toast.success("Setup complete");
      await reload();
    });

  const row = (ok: boolean, label: string, optional = false) => (
    <li className="text-sm">
      {ok ? "Done" : optional ? "Optional" : "Missing"} · {label}
    </li>
  );

  return (
    <div className="skeu-card space-y-4">
      <h2 className="text-lg font-semibold">Finish</h2>
      <ul className="space-y-1">
        {row(s.steps.basics, "Location and target roles")}
        {row(s.steps.resume, "At least one resume")}
        {row(s.steps.github, "GitHub imported", true)}
        {row(s.steps.facts, "At least one approved fact")}
      </ul>
      {s.complete ? (
        <div className="text-sm space-y-2">
          <p className="font-medium">Setup is complete.</p>
          <p className="text-text-muted">
            Next, create an API key in Settings and connect Claude Code. Run
            <code className="mx-1">/fm-setup</code> there to have Claude suggest
            clusters, tighter facts and resume fixes. Nothing it proposes
            applies until you approve it.
          </p>
        </div>
      ) : (
        <Button variant="primary" onClick={finish} isLoading={busy === "finish"} disabled={s.missing.length > 0}>
          Complete setup
        </Button>
      )}
      {!s.complete && s.missing.length > 0 && (
        <ul className="text-sm text-text-muted list-disc pl-5">
          {s.missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
