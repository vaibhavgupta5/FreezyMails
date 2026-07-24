"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Variable, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
} from "@/components/ui/attachment";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content: z.string(),
        size: z.number(),
      }),
    )
    .optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

type TemplateAttachment = {
  filename: string;
  content: string;
  size: number;
};

type TemplateFormProps = {
  initialData?: Omit<TemplateFormData, "attachments"> & {
    id: string;
    attachments?: unknown;
    variables?: unknown;
  };
};

export default function TemplateForm({ initialData }: TemplateFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fallbacks, setFallbacks] = useState<Record<string, string>>(() => {
    const initialVars = initialData?.variables;
    const initialFallbacks: Record<string, string> = {};
    if (Array.isArray(initialVars)) {
      initialVars.forEach(v => {
        if (typeof v === 'object' && v !== null && 'name' in v && 'fallback' in v) {
          const varObj = v as { name: string; fallback: string };
          initialFallbacks[varObj.name] = varObj.fallback;
        }
      });
    }
    return initialFallbacks;
  });

  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiConfig, setShowAiConfig] = useState(false);
  const [aiContext, setAiContext] = useState({
    industry: "",
    goal: "",
    tone: "professional",
    description: "",
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          subject: initialData.subject,
          body: initialData.body,
          attachments:
            (initialData.attachments as TemplateAttachment[] | undefined) || [],
        }
      : {
          name: "",
          subject: "",
          body: "",
          attachments: [],
        },
  });

  const bodyValue = watch("body") || "";
  const subjectValue = watch("subject") || "";
  const attachments = watch("attachments") || [];

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
  const ALLOWED_TYPES = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".csv", ".txt"];

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    e.target.value = "";

    const invalidType = Array.from(files).filter(
      (f) => !ALLOWED_TYPES.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (invalidType.length > 0) {
      toast.error(`${invalidType.map((f) => f.name).join(", ")} ha${invalidType.length === 1 ? "s" : "ve"} an unsupported file type`);
      return;
    }

    const oversized = Array.from(files).filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      toast.error(`${oversized.map((f) => f.name).join(", ")} exceed${oversized.length === 1 ? "s" : ""} the 2 MB limit`);
      return;
    }

    const newAttachments = [...attachments];
    let processedCount = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = (event.target?.result as string).split(",")[1];

        newAttachments.push({
          filename: file.name,
          content: base64String,
          size: file.size,
        });

        processedCount++;
        if (processedCount === files.length) {
          setValue("attachments", newAttachments as TemplateAttachment[], { shouldDirty: true });
          toast.success(`Added ${files.length} attachment(s)`);
        }
      };
      reader.onerror = () => {
        toast.error(`Failed to read file: ${file.name}`);
        processedCount++;
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, idx) => idx !== index);
    setValue("attachments", newAttachments, { shouldDirty: true });
    toast.success("Attachment removed");
  };

  // Extract variables
  const variables = useMemo(() => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = Array.from(bodyValue.matchAll(regex), (m) => m[1].trim());
    const subjectMatches = Array.from(subjectValue.matchAll(regex), (m) =>
      m[1].trim(),
    );
    return Array.from(new Set([...matches, ...subjectMatches]));
  }, [bodyValue, subjectValue]);

  const onSubmit = async (data: TemplateFormData) => {
    setSaving(true);
    setError(null);
    try {
      const url = initialData
        ? `/api/templates/${initialData.id}`
        : "/api/templates";
      const method = initialData ? "PUT" : "POST";

      // We also need to extract variables to send to the backend
      const payload = {
        ...data,
        variables: variables.map(v => ({ name: v, fallback: fallbacks[v] || "" })),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save template");
      }
      toast.success(
        initialData
          ? "Template updated successfully!"
          : "Template created successfully!",
      );
      router.push("/templates");
      router.refresh();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save template";
      setError(errorMessage);
      toast.error(errorMessage);
      setSaving(false);
    }
  };

  const handleGenerateAI = async () => {
    setAiGenerating(true);
    try {
      const res = await fetch("/api/gemini/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...aiContext,
          subject: subjectValue,
          body: bodyValue,
        }),
      });
      if (!res.ok) throw new Error("AI generation failed");

      const data = await res.json();
      if (data.subject && data.body) {
        setValue("subject", data.subject);
        setValue("body", data.body);
        toast.success("Generated AI draft!");
        setShowAiConfig(false);
      } else {
        throw new Error("Invalid AI response");
      }
    } catch (_err: unknown) {
      const err = _err as Error;
      toast.error(err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Form */}
        <div className="skeu-card p-6 space-y-4 -skeu-base flex flex-col">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-text-primary">
              Template Content
            </h2>
            <Drawer open={showAiConfig} onOpenChange={setShowAiConfig}>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className="flex items-center gap-2 text-sm text-primary-base font-medium cursor-pointer"
                >
                  <Sparkles size={16} />
                  AI Assist
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="mx-auto w-full max-w-md">
                  <DrawerHeader>
                    <DrawerTitle className="text-text-primary flex items-center gap-2">
                      <Sparkles size={18} className="text-primary-base" />
                      AI Assist
                    </DrawerTitle>
                  </DrawerHeader>
                  <div className="p-4 px-6 space-y-4 pb-8">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        What is this mail about?
                      </label>
                      <Textarea
                        placeholder="e.g. Follow up on our previous call..."
                        value={aiContext.description}
                        onChange={(e) =>
                          setAiContext({
                            ...aiContext,
                            description: e.target.value,
                          })
                        }
                        className="skeu-input resize-none h-20"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          Industry
                        </label>
                        <Input
                          placeholder="e.g. SaaS"
                          value={aiContext.industry}
                          onChange={(e) =>
                            setAiContext({
                              ...aiContext,
                              industry: e.target.value,
                            })
                          }
                          className="skeu-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          Goal
                        </label>
                        <Input
                          placeholder="e.g. Book a meeting"
                          value={aiContext.goal}
                          onChange={(e) =>
                            setAiContext({ ...aiContext, goal: e.target.value })
                          }
                          className="skeu-input"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        Tone
                      </label>
                      <Select
                        value={aiContext.tone}
                        onValueChange={(val) =>
                          setAiContext({ ...aiContext, tone: val })
                        }
                      >
                        <SelectTrigger className="skeu-select w-full">
                          <SelectValue placeholder="Select Tone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">
                            Professional
                          </SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="bold">Bold & Direct</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleGenerateAI}
                      isLoading={aiGenerating}
                      leftIcon={<Sparkles size={16} />}
                      className="w-full py-2 mt-4"
                    >
                      Generate Draft
                    </Button>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">
              Template Name (Internal)
            </label>
            <Input
              {...register("name")}
              className="skeu-input mt-1"
              placeholder="e.g. Follow-up Campaign Step 1"
            />
            {errors.name && (
              <p className="text-danger-text text-xs mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">
              Subject Line
            </label>
            <Input
              {...register("subject")}
              className="skeu-input mt-1"
              placeholder="e.g. Quick question regarding {{companyName}}"
            />
            {errors.subject && (
              <p className="text-danger-text text-xs mt-1">
                {errors.subject.message}
              </p>
            )}
          </div>

          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-medium text-text-primary">
              Email Body
            </label>
            <Textarea
              {...register("body")}
              className="skeu-textarea mt-1 font-mono flex-1 min-h-[300px]"
              placeholder="Hi {{firstName}},&#10;&#10;I wanted to reach out because..."
            />
            {errors.body && (
              <p className="text-danger-text text-xs mt-1">
                {errors.body.message}
              </p>
            )}
            <p className="text-xs text-text-muted mt-2">
              Use double curly braces for dynamic variables, e.g.{" "}
              {"{{firstName}}"}.
            </p>
          </div>

          <div className="space-y-2 border-t border-border-subtle pt-4">
            <label className="block text-sm font-medium text-text-primary">
              Attachments
            </label>
            <div className="flex flex-col gap-2">
              {attachments.length > 0 && (
                <>
                  <AttachmentGroup className="w-full pb-2 border-b border-border-subtle mb-2">
                    {attachments.map((att, idx) => {
                      const a = att as { filename: string; content: string; size?: number };
                      return (
                        <Attachment key={idx} size="sm">
                          <AttachmentMedia variant="icon" />
                          <AttachmentContent>
                            <AttachmentTitle>{a.filename}</AttachmentTitle>
                            {a.size !== undefined && (
                              <AttachmentDescription>
                                {formatBytes(a.size)}
                              </AttachmentDescription>
                            )}
                          </AttachmentContent>
                          <AttachmentActions>
                            <AttachmentAction onClick={() => removeAttachment(idx)}>
                              <Trash2 />
                            </AttachmentAction>
                          </AttachmentActions>
                        </Attachment>
                      );
                    })}
                  </AttachmentGroup>
                  {(() => {
                    const totalBytes = attachments.reduce((sum, a) => sum + ((a as { size?: number }).size || 0), 0);
                    return totalBytes > 8 * 1024 * 1024 ? (
                      <p className="text-[11px] text-warning-text font-medium pt-1">
                        Total size {formatBytes(totalBytes)} — some email providers may reject emails larger than 10 MB.
                      </p>
                    ) : null;
                  })()}
                </>
              )}

              <label className="skeu-btn-ghost text-xs py-2 text-center cursor-pointer border border-dashed border-border-subtle hover:border-text-muted rounded-md flex items-center justify-center gap-1.5 font-medium">
                Add File Attachment
                <span className="text-text-muted font-normal">· max 2 MB each</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.csv,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-danger-bg text-danger-text text-sm rounded border border-transparent">
              {error}
            </div>
          )}
        </div>

        {/* Right Column: Preview & Variables */}
        <div className="space-y-6 flex flex-col">
          <div className="skeu-card p-6 -skeu-base">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-4">
              <Variable size={18} className="text-primary-base" />
              Detected Variables
            </h2>
            {variables.length === 0 ? (
              <p className="text-sm text-text-muted italic">
                No variables detected yet. Type {"{{variableName}}"} to add one.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {variables.map((v) => (
                  <div
                    key={v}
                    className="flex flex-col gap-1.5 p-3 bg-bg-subtle border border-border-subtle rounded-md"
                  >
                    <span className="text-xs font-mono font-medium text-text-primary">
                      {v}
                    </span>
                    <Input
                      placeholder="Default value (optional)"
                      value={fallbacks[v] || ""}
                      onChange={(e) => setFallbacks(prev => ({ ...prev, [v]: e.target.value }))}
                      className="skeu-input text-sm h-8"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="skeu-card flex-1 p-0 -skeu-base overflow-hidden flex flex-col">
            <div className="bg-bg-subtle border-b border-border-subtle p-4">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
                Live Preview
              </h2>
            </div>
            <div className="p-6 flex-1 bg-bg-base overflow-y-auto prose dark:prose-invert prose-sm max-w-none">
              <div className="mb-4 pb-4 border-b border-border-subtle">
                <p
                  className="text-text-primary text-lg font-medium"
                  dangerouslySetInnerHTML={{
                    __html: subjectValue
                      ? subjectValue.replace(
                          /\{\{([^}]+)\}\}/g,
                          '<mark class="bg-bg-subtle text-primary-base font-bold px-1 rounded">$&</mark>',
                        )
                      : '<span class="text-text-muted italic">No subject</span>',
                  }}
                />
              </div>
              <div
                className="whitespace-pre-wrap text-text-primary"
                dangerouslySetInnerHTML={{
                  __html: bodyValue
                    ? bodyValue.replace(
                        /\{\{([^}]+)\}\}/g,
                        '<mark class="bg-bg-subtle text-primary-base font-bold px-1 rounded">$&</mark>',
                      )
                    : '<span class="text-text-muted italic">No body content</span>',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          variant="ghost"
          type="button"
          onClick={() => router.push("/templates")}
          className="px-6 py-2 "
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={saving}
          className="px-8 py-2 font-medium"
        >
          Save Template
        </Button>
      </div>
    </form>
  );
}
