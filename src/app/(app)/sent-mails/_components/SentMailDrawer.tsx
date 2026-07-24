"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { X, Send, User, Calendar, FileText, Reply } from "lucide-react";
import { renderTemplate } from "@/lib/template-parser";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SentMailData } from "./SentMailsList";

type SentMailDrawerProps = {
  mail: SentMailData | null;
  onClose: () => void;
  accounts: { id: string; label: string; fromEmail: string }[];
  templates: { id: string; name: string; subject: string; body: string; variables?: unknown }[];
};

export default function SentMailDrawer({
  mail,
  onClose,
  accounts,
  templates,
}: SentMailDrawerProps) {
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpData, setFollowUpData] = useState({
    accountId: "",
    templateId: "custom",
    subject: "",
    body: "",
  });
  const [isSending, setIsSending] = useState(false);

  const [prevMail, setPrevMail] = useState<SentMailData | null>(null);

  if (mail !== prevMail) {
    setPrevMail(mail);
    if (mail) {
      setShowFollowUp(false);
      setFollowUpData({
        accountId:
          mail.accountId || (accounts.length > 0 ? accounts[0].id : ""),
        templateId: "custom",
        subject: `Re: ${mail.subject || "No Subject"}`,
        body: "",
      });
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === "custom") {
      setFollowUpData((prev) => ({
        ...prev,
        templateId,
        subject: "",
        body: "",
      }));
      return;
    }
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      const templateFallbacks: Record<string, string> = {};
      if (template.variables) {
        let varsArr: unknown[] = [];
        if (Array.isArray(template.variables)) {
          varsArr = template.variables;
        } else if (typeof template.variables === "string") {
          try {
            const parsed = JSON.parse(template.variables);
            if (Array.isArray(parsed)) varsArr = parsed;
          } catch (e) {}
        }

        varsArr.forEach((v) => {
          if (typeof v === "object" && v !== null && "name" in v) {
            const varObj = v as { name: string; fallback?: unknown };
            if (varObj.fallback !== undefined && varObj.fallback !== null) {
              const fallbackStr = String(varObj.fallback).trim();
              if (
                fallbackStr &&
                fallbackStr !== "undefined" &&
                fallbackStr !== "null"
              ) {
                templateFallbacks[varObj.name] = fallbackStr;
              }
            }
          }
        });
      }

      const dynamicData = { email: mail?.email || "" };

      setFollowUpData((prev) => ({
        ...prev,
        templateId,
        subject: renderTemplate(template.subject, dynamicData, templateFallbacks),
        body: renderTemplate(template.body, dynamicData, templateFallbacks),
      }));
    }
  };

  const handleSendFollowUp = async () => {
    if (!mail) return;
    if (!followUpData.accountId) {
      toast.error("Please select an email account to send from.");
      return;
    }
    if (!followUpData.subject || !followUpData.body) {
      toast.error("Subject and body are required.");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/sent-mails/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: mail.recipientId,
          accountId: followUpData.accountId,
          subject: followUpData.subject,
          body: followUpData.body,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send follow-up");
      }

      toast.success("Follow-up email sent successfully!");
      setShowFollowUp(false);
      // Wait a moment then close or just show success
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message || "Error sending email");
      } else {
        toast.error("Error sending email");
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Drawer open={!!mail} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-4xl h-full flex flex-col overflow-hidden">
          <DrawerHeader className="border-b border-border-subtle flex justify-between items-center px-4 md:px-6">
            <DrawerTitle className="text-text-primary text-lg md:text-xl flex items-center gap-2">
              <FileText size={20} className="text-primary-base" />
              Sent Mail Details
            </DrawerTitle>
            <Button
              variant="none"
              size="sm"
              onClick={onClose}
              className="text-text-muted hover:text-text-primary"
            >
              <X size={20} />
            </Button>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Left: Original Mail Details */}
            <div className="flex-1 space-y-4 md:space-y-6">
              <div className="skeu-card p-5 md:p-6 space-y-5">
                <div className="flex items-center gap-3 border-b border-border-subtle pb-4">
                  <div className="w-10 h-10 rounded-full bg-primary-base/10 text-primary-base flex items-center justify-center shrink-0">
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-text-muted mb-0.5">
                      To
                    </div>
                    <div className="text-sm font-semibold text-text-primary truncate">
                      {mail?.email}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-bg-subtle flex items-center justify-center text-text-muted shrink-0 border border-border-subtle">
                       <Calendar size={14} />
                     </div>
                     <div className="min-w-0">
                       <div className="text-[10px] uppercase tracking-wider font-bold text-text-muted mb-0.5">Date Sent</div>
                       <div className="text-sm font-medium text-text-primary truncate">{mail?.sentAt && format(new Date(mail.sentAt), "PPP p")}</div>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-bg-subtle flex items-center justify-center text-text-muted shrink-0 border border-border-subtle">
                       <FileText size={14} />
                     </div>
                     <div className="min-w-0">
                       <div className="text-[10px] uppercase tracking-wider font-bold text-text-muted mb-0.5">Campaign</div>
                       <div className="text-sm font-medium text-text-primary truncate">{mail?.campaignName || "Manual Send"}</div>
                     </div>
                  </div>
                </div>
              </div>

              <div className="skeu-card p-0 overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-border-subtle bg-bg-subtle/50">
                  <h3 className={`font-semibold text-base md:text-lg ${!mail?.subject ? "text-text-muted italic" : "text-text-primary"}`}>
                    {mail?.subject || "No Subject"}
                  </h3>
                </div>
                <div
                  className="prose prose-sm max-w-none bg-white text-black p-5 md:p-6 overflow-x-auto [&_*]:!text-black min-h-[100px]"
                  dangerouslySetInnerHTML={{ __html: mail?.body || "<span style='color: #94a3b8; font-style: italic;'>No content</span>" }}
                />
              </div>
            </div>

            {/* Right: Follow-up Action */}
            <div className="w-full md:w-[350px] shrink-0 border-t md:border-t-0 md:border-l border-border-subtle pt-6 md:pt-0 md:pl-8 flex flex-col">
              {!showFollowUp ? (
                <div className="bg-primary-base/5 border border-primary-base/20 rounded-xl p-6 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 bg-primary-base/10 rounded-full flex items-center justify-center text-primary-base">
                    <Reply size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">
                      Send a Follow-up
                    </h4>
                    <p className="text-sm text-text-muted mt-1">
                      Manually send an email to {mail?.email} right now.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => setShowFollowUp(true)}
                  >
                    Compose Reply
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-text-primary">
                      New Follow-up
                    </h3>
                    <Button
                      variant="none"
                      size="sm"
                      className="text-text-muted h-6 px-2 text-xs"
                      onClick={() => setShowFollowUp(false)}
                    >
                      Cancel
                    </Button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                      From Account
                    </label>
                    <Select
                      value={followUpData.accountId}
                      onValueChange={(val) =>
                        setFollowUpData({ ...followUpData, accountId: val })
                      }
                    >
                      <SelectTrigger className="skeu-select w-full">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.label} ({acc.fromEmail})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                      Use Template (Optional)
                    </label>
                    <Select
                      value={followUpData.templateId}
                      onValueChange={handleTemplateSelect}
                    >
                      <SelectTrigger className="skeu-select w-full">
                        <SelectValue placeholder="Custom Email" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom Email</SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                      Subject
                    </label>
                    <Input
                      className="skeu-input"
                      value={followUpData.subject}
                      onChange={(e) =>
                        setFollowUpData({
                          ...followUpData,
                          subject: e.target.value,
                        })
                      }
                      placeholder="Email subject"
                    />
                  </div>

                  <div className="flex-1 flex flex-col min-h-[200px]">
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                      Message
                    </label>
                    <Textarea
                      className="skeu-input flex-1 resize-none font-mono text-sm"
                      value={followUpData.body}
                      onChange={(e) =>
                        setFollowUpData({
                          ...followUpData,
                          body: e.target.value,
                        })
                      }
                      placeholder="Write your email here... (HTML supported)"
                    />
                  </div>

                  <Button
                    variant="primary"
                    className="w-full mt-auto"
                    leftIcon={<Send size={16} />}
                    onClick={handleSendFollowUp}
                    isLoading={isSending}
                  >
                    Send Now
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
