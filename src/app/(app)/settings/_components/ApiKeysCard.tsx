"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeysCard() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<"read" | "write">("read");
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/api-keys");
    if (res.ok) setKeys(await res.json());
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/api-keys")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active) setKeys(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const mcpUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/mcp` : "/api/mcp";

  const createKey = async () => {
    setLoading(true);
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, scopes }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setNewKey(data.key);
      setName("");
      load();
    } else {
      toast.error(data.error || "Failed to create key");
    }
    setLoading(false);
  };

  const revoke = async (id: string) => {
    const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Key revoked");
      load();
    } else {
      toast.error("Failed to revoke key");
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const command = `claude mcp add --transport http freezymails ${mcpUrl} --header "Authorization: Bearer ${newKey ?? "<your-key>"}"`;

  return (
    <div className="skeu-card">
      <h2 className="text-xl font-semibold mb-1">Claude Code access (MCP)</h2>
      <p className="text-sm text-text-muted mb-4">
        API keys let Claude Code read your accounts, campaigns, replies and
        audience. &quot;Read + propose&quot; also lets Claude suggest profile facts, which
        stay unused until you approve them. Keys can be revoked at any time.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 max-w-md mb-4">
        <Input
          className="skeu-input"
          placeholder="Key name, e.g. Claude Code laptop"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="skeu-select h-10 rounded-md px-3 text-sm"
          value={scopes}
          onChange={(e) => setScopes(e.target.value as "read" | "write")}
          aria-label="Key access"
        >
          <option value="read">Read only</option>
          <option value="write">Read + propose</option>
        </select>
        <Button
          variant="primary"
          className="whitespace-nowrap"
          onClick={createKey}
          isLoading={loading}
          disabled={!name.trim()}
        >
          Create key
        </Button>
      </div>

      {newKey && (
        <div className="p-4 mb-4 rounded-lg border border-border bg-bg-subtle space-y-2">
          <p className="text-sm font-medium">
            Copy this key now. It will not be shown again.
          </p>
          <div className="flex gap-2 items-center">
            <code className="text-xs break-all flex-1">{newKey}</code>
            <Button variant="ghost" size="sm" onClick={() => copy(newKey)}>
              Copy key
            </Button>
          </div>
          <p className="text-sm font-medium pt-2">Connect Claude Code:</p>
          <div className="flex gap-2 items-start">
            <code className="text-xs break-all flex-1">{command}</code>
            <Button variant="ghost" size="sm" onClick={() => copy(command)}>
              Copy command
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setNewKey(null)}>
            I have saved it
          </Button>
        </div>
      )}

      {keys.length === 0 ? (
        <p className="text-sm text-text-muted">No active keys.</p>
      ) : (
        <ul className="divide-y divide-border">
          {keys.map((k) => (
            <li key={k.id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{k.name}</p>
                <p className="text-xs text-text-muted">
                  {k.keyPrefix}… · {k.scopes.join(", ")} · created{" "}
                  {new Date(k.createdAt).toLocaleDateString()} ·{" "}
                  {k.lastUsedAt
                    ? `last used ${new Date(k.lastUsedAt).toLocaleString()}`
                    : "never used"}
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => revoke(k.id)}>
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
