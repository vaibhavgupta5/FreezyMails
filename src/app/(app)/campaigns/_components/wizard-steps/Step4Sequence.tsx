import { useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCampaignStore } from "@/stores/useCampaignStore";
import { Button } from "@/components/ui/button";

export default function Step4Sequence({
  campaignId,
  isSaving,
  handleSave,
}: {
  campaignId?: string;
  isSaving: boolean;
  handleSave: () => Promise<void>;
}) {
  const {
    setStep,
    sequenceSteps,
    setSequenceSteps,
    scheduledAt,
    setScheduledAt,
  } = useCampaignStore();

  const [aiSequenceOptions, setAiSequenceOptions] = useState({
    icp: "",
    offer: "",
    tone: "professional",
  });
  const [isGeneratingSequence, setIsGeneratingSequence] = useState(false);

  const handleGenerateSequence = async () => {
    if (!aiSequenceOptions.icp || !aiSequenceOptions.offer) {
      toast.error("Please fill in ICP and Offer to generate a sequence");
      return;
    }
    setIsGeneratingSequence(true);
    try {
      const res = await fetch("/api/gemini/sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...aiSequenceOptions, steps: 3 }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate");
      }
      const data = (await res.json()) as {
        sequence?: Array<{ subject?: string; body?: string }>;
      };
      if (data.sequence && Array.isArray(data.sequence)) {
        const newSteps = data.sequence.map((step, index: number) => ({
          stepIndex: index + 1,
          delayDays: 3,
          subject: step.subject || "",
          body: step.body || "",
        }));
        setSequenceSteps(newSteps);
        toast.success("Sequence generated!");
      }
    } catch (_err: unknown) {
      const err = _err as Error;
      toast.error(err.message);
    } finally {
      setIsGeneratingSequence(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="skeu-card">
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Follow-up Sequences</h2>
            <p className="text-sm text-text-muted">
              {"Automatically follow up if they don't reply."}
            </p>
          </div>
          <Button
            variant="none"
            className="skeu-btn-ghost flex items-center gap-2 border border-dashed border-border-subtle"
            onClick={() => {
              const newSteps = [
                ...sequenceSteps,
                {
                  stepIndex: sequenceSteps.length + 1,
                  delayDays: 3,
                  subject: "",
                  body: "",
                },
              ];
              setSequenceSteps(newSteps);
            }}
          >
            <Plus size={16} /> Add Step
          </Button>
        </div>

        <div className="mb-6 p-4 rounded-xl border border-border-subtle bg-bg-subtle/50">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Sparkles size={16} className="text-primary-base" /> AI Sequence Writer
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                Ideal Customer Profile (ICP)
              </label>
              <input
                type="text"
                className="skeu-input w-full text-sm h-9"
                placeholder="e.g. VPs of Sales at B2B SaaS"
                value={aiSequenceOptions.icp}
                onChange={(e) =>
                  setAiSequenceOptions({
                    ...aiSequenceOptions,
                    icp: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                Offer / Value Prop
              </label>
              <input
                type="text"
                className="skeu-input w-full text-sm h-9"
                placeholder="e.g. Save 10 hours a week on prospecting"
                value={aiSequenceOptions.offer}
                onChange={(e) =>
                  setAiSequenceOptions({
                    ...aiSequenceOptions,
                    offer: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full text-sm h-9"
            onClick={handleGenerateSequence}
            isLoading={isGeneratingSequence}
          >
            Generate 3-Step Sequence
          </Button>
        </div>

        {sequenceSteps.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border-subtle rounded-xl text-text-muted bg-bg-subtle/50">
            <p className="font-semibold text-text-primary mb-1">No follow-ups.</p>
            <p className="text-sm">{"We'll just send the initial email."}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sequenceSteps.map((seqStep, idx) => (
              <div
                key={idx}
                className="p-5 border border-border-subtle rounded-xl bg-bg-subtle relative group shadow-sm"
              >
                <Button
                  variant="none"
                  onClick={() => {
                    const newSteps = sequenceSteps.filter((_, i) => i !== idx);
                    newSteps.forEach((s, i) => (s.stepIndex = i + 1));
                    setSequenceSteps(newSteps);
                  }}
                  className="absolute top-4 right-4 text-text-muted hover:text-danger-text p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                >
                  <Trash2 size={16} />
                </Button>
                <div className="flex flex-wrap gap-2 sm:gap-4 items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary-base/10 text-primary-base font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Wait</span>
                    <input
                      type="number"
                      className="skeu-input w-20 h-8 px-2 text-center bg-bg-base"
                      value={seqStep.delayDays}
                      onChange={(e) => {
                        const newSteps = [...sequenceSteps];
                        newSteps[idx].delayDays = parseInt(e.target.value) || 0;
                        setSequenceSteps(newSteps);
                      }}
                    />
                    <span className="text-sm font-semibold">days, then send:</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                      Subject
                    </label>
                    <input
                      className="skeu-input w-full bg-bg-base"
                      placeholder="Leave blank to send as a reply thread (Re: [Original Subject])"
                      value={seqStep.subject}
                      onChange={(e) => {
                        const newSteps = [...sequenceSteps];
                        newSteps[idx].subject = e.target.value;
                        setSequenceSteps(newSteps);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                      Body
                    </label>
                    <textarea
                      className="skeu-textarea w-full bg-bg-base"
                      rows={4}
                      placeholder="Just following up on my last email..."
                      value={seqStep.body}
                      onChange={(e) => {
                        const newSteps = [...sequenceSteps];
                        newSteps[idx].body = e.target.value;
                        setSequenceSteps(newSteps);
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-border-subtle">
        <h3 className="text-sm font-semibold mb-3">
          Schedule Campaign (Optional)
        </h3>
        <p className="text-sm text-text-muted mb-3">
          Leave blank to send immediately, or pick a date/time to schedule it.
        </p>
        <input
          type="datetime-local"
          className="skeu-input bg-bg-base px-3 py-2 text-sm"
          value={scheduledAt || ""}
          onChange={(e) => setScheduledAt(e.target.value || null)}
        />
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={() => setStep(3)}>
          Back
        </Button>
        <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
          {campaignId ? "Save Changes" : "Launch Campaign"}
        </Button>
      </div>
    </div>
  );
}
