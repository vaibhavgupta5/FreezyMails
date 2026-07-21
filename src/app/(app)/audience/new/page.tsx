"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function NewAudiencePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const createList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("List name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to create list");
      
      toast.success("List created!");
      router.push(`/audience/${data.id || ""}`); // Assuming the API returns the created list's ID
      // If it doesn't return ID, we can push to /audience
      if (!data.id) router.push("/audience");
      
    } catch (_err: unknown) { const err = _err as Error;
      toast.error(err.message || "Error creating list");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="skeu-page h-[100dvh] overflow-y-auto w-full">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/audience" className="text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-semibold text-text-primary">New Mailing List</h1>
        </div>

        <Card className="skeu-card p-6">
          <form onSubmit={createList} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">List Name</Label>
              <Input
                id="name"
                placeholder="e.g. Newsletter Subscribers, Cold Leads Q3"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <p className="text-sm text-text-muted">
                Give your mailing list a descriptive name to help you identify it later.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push("/audience")}>
                Cancel
              </Button>
              <Button type="submit" className="skeu-btn-primary" disabled={loading}>
                {loading ? "Creating..." : "Create List"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
