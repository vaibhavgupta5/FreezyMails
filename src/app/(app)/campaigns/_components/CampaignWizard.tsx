"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
 AlertTriangle,
 Check,
 Trash2,
 Plus,
 Type,
 Table as TableIcon,
 Upload,
 Sparkles,
} from "lucide-react";
import type { Template, EmailAccount } from "@prisma/client";
import PageSkeleton from "../../_components/PageSkeleton";
import { useCampaignStore } from "@/stores/useCampaignStore";
import Papa from "papaparse";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import {
 Drawer,
 DrawerContent,
 DrawerHeader,
 DrawerTitle,
 DrawerDescription,
 DrawerFooter,
} from "@/components/ui/drawer";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
interface TemplateAttachment {
 filename: string;
 content: string;
}

type CampaignWizardTemplate = Template & {
 attachments?: TemplateAttachment[];
};

export default function CampaignWizard({ campaignId }: { campaignId?: string }) {
 const router = useRouter();
 const equalizeSplits = (count: number) => {
 if (count === 0) return [];
 const base = Math.floor(100 / count);
 let remainder = 100 % count;
 return Array.from({ length: count }, () => {
 if (remainder > 0) {
 remainder--;
 return base + 1;
 }
 return base;
 });
 };

 const {
 step,
 setStep,
 inputMode,
 setInputMode,
 name,
 templateId,
 accountIds,
 setDetails,
 recipientsText,
 setRecipientsText,
 parsedRecipients,
 validationErrors,
 isValid,
 globalError,
 setGlobalError,
 templateVariants,
 setTemplateVariants,
 pacingType,
 setPacingType,
 sequenceSteps,
 setSequenceSteps,
 scheduledAt,
 setScheduledAt,
 resetDraft,
 } = useCampaignStore();

 const [templates, setTemplates] = useState<CampaignWizardTemplate[]>([]);
 const [accounts, setAccounts] = useState<EmailAccount[]>([]);
 const [audienceLists, setAudienceLists] = useState<{ id: string; name: string }[]>([]);
 const [loading, setLoading] = useState(true);

 // Audience import mapping states
 const [isMappingDrawerOpen, setIsMappingDrawerOpen] = useState(false);
 const [isFetchingList, setIsFetchingList] = useState(false);
 const [fetchedContacts, setFetchedContacts] = useState<{ email?: string; customFields?: Record<string, string> }[]>([]);
 const [availableListFields, setAvailableListFields] = useState<string[]>([]);
 const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

 const [aiSequenceOptions, setAiSequenceOptions] = useState({ icp: '', offer: '', tone: 'professional' });
 const [isGeneratingSequence, setIsGeneratingSequence] = useState(false);

 const handleGenerateSequence = async () => {
 if (!aiSequenceOptions.icp || !aiSequenceOptions.offer) {
 toast.error('Please fill in ICP and Offer to generate a sequence');
 return;
 }
 setIsGeneratingSequence(true);
 try {
 const res = await fetch('/api/gemini/sequence', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ ...aiSequenceOptions, steps: 3 }),
 });
 if (!res.ok) {
 const data = await res.json();
 throw new Error(data.error || 'Failed to generate');
 }
 const data = (await res.json()) as {
 sequence?: Array<{ subject?: string; body?: string }>;
 };
 if (data.sequence && Array.isArray(data.sequence)) {
 // We skip step 0 as it's typically the initial email (unless user wants it as a follow-up)
 // Actually, if we're creating follow-ups, let's just add them as follow-up steps
 const newSteps = data.sequence.map((step, index: number) => ({
 stepIndex: index + 1,
 delayDays: index === 0 ? 3 : 3, 
 subject: step.subject || '',
 body: step.body || '',
 }));
 setSequenceSteps(newSteps);
 toast.success('Sequence generated!');
 }
 } catch (_err: unknown) {
 const err = _err as Error;
 toast.error(err.message);
 } finally {
 setIsGeneratingSequence(false);
 }
 };

 const selectedTemplate = templates.find((t) => t.id === templateId);
 const requiredHeaders = selectedTemplate
 ? ["email", ...((selectedTemplate.variables as string[]) || [])]
 : ["email"];

 useEffect(() => {
 Promise.all([
 fetch("/api/templates").then((r) => r.json()),
 fetch("/api/accounts").then((r) => r.json()),
 fetch("/api/lists").then((r) => r.json()),
 ]).then(([tData, aData, lData]) => {
 setTemplates(tData || []);
 setAccounts(aData || []);
 setAudienceLists(Array.isArray(lData) ? lData : []);
 setLoading(false);
 });
 }, []);

 useEffect(() => {
 if (step === 3 && templateVariants.length === 0 && selectedTemplate) {
 setTemplateVariants([
 {
 name: "Variant A",
 body: selectedTemplate.body,
 splitPercent: 100,
 subjectVariants: [
 {
 name: "Subject 1",
 subject: selectedTemplate.subject,
 splitPercent: 100,
 },
 ],
 },
 ]);
 }
 }, [step, templateVariants.length, selectedTemplate, setTemplateVariants]);

 const getTableRows = () => {
 let lines = recipientsText.split("\n").filter((l) => l !== "");
 if (lines.length > 0 && lines[0].toLowerCase().startsWith("email"))
 lines = lines.slice(1);
 if (lines.length === 0) return [{}];

 const delimiter = lines[0].includes("\t") ? "\t" : ",";
 return lines.map((line) => {
 const vals = line.split(delimiter);
 const obj: Record<string, string> = {};
 requiredHeaders.forEach((h, i) => {
 obj[h] = vals[i] || "";
 });
 return obj;
 });
 };

 const handleTableChange = (
 rowIndex: number,
 header: string,
 value: string,
 ) => {
 const rows = getTableRows();
 rows[rowIndex][header] = value;
 const newText = rows
 .map((r) => requiredHeaders.map((h) => r[h] || "").join("\t"))
 .join("\n");
 setRecipientsText(newText, templates);
 };

 const handleAddRow = () => {
 const rows = getTableRows();
 rows.push({});
 const newText = rows
 .map((r) => requiredHeaders.map((h) => r[h] || "").join("\t"))
 .join("\n");
 setRecipientsText(newText, templates);
 };

 const handleRemoveRow = (rowIndex: number) => {
 const rows = getTableRows();
 rows.splice(rowIndex, 1);
 const newText = rows
 .map((r) => requiredHeaders.map((h) => r[h] || "").join("\t"))
 .join("\n");
 setRecipientsText(newText, templates);
 };

 const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 Papa.parse(file, {
 header: true,
 skipEmptyLines: true,
 complete: (results) => {
 if (!results.data || results.data.length === 0) {
 toast.error("CSV is empty or invalid");
 return;
 }

 const delimiter = "\t";
 // Create header row
 const rows = [requiredHeaders.join(delimiter)];

 // Map data
 (results.data as Record<string, string>[]).forEach((row) => {
 const values = requiredHeaders.map((h) => {
 // Fuzzy match keys (case insensitive)
 const matchedKey = Object.keys(row).find(
 (k) => k.toLowerCase() === h.toLowerCase(),
 );
 return matchedKey ? row[matchedKey] : "";
 });
 rows.push(values.join(delimiter));
 });

 setRecipientsText(rows.join("\n"), templates);
 toast.success(`Imported ${results.data.length} rows`);
 setInputMode("table"); // switch back to table view to see results
 },
 error: (error) => {
 toast.error("Failed to parse CSV: " + error.message);
 },
 });
 };

 const handleImportFromAudience = async (listId: string) => {
 if (!listId || listId === "none") return;
 setIsMappingDrawerOpen(true);
 setIsFetchingList(true);
 try {
 const res = await fetch(`/api/lists/${listId}`);
 if (!res.ok) throw new Error("Failed to load list");
 const data = await res.json();
 if (!data.contacts || data.contacts.length === 0) {
 toast.error("Mailing list is empty");
 setIsMappingDrawerOpen(false);
 return;
 }
 
 setFetchedContacts(data.contacts);

 // Extract all unique fields from the list
 const fieldsSet = new Set<string>();
 fieldsSet.add("email"); // email is always there
 
 data.contacts.forEach((contact: { email?: string; customFields?: Record<string, string> }) => {
 if (contact.customFields) {
 Object.keys(contact.customFields).forEach((k) => fieldsSet.add(k));
 }
 });
 const extractedFields = Array.from(fieldsSet);
 setAvailableListFields(extractedFields);

 // Pre-populate mapping based on case-insensitive match
 const initialMapping: Record<string, string> = {};
 requiredHeaders.forEach((h) => {
 const match = extractedFields.find((f) => f.toLowerCase() === h.toLowerCase());
 if (match) {
 initialMapping[h] = match;
 }
 });
 setFieldMapping(initialMapping);

 } catch (_err: unknown) { const err = _err as Error;
 toast.error(err.message);
 setIsMappingDrawerOpen(false);
 } finally {
 setIsFetchingList(false);
 }
 };

 const confirmListImport = () => {
 const delimiter = "\t";
 const rows = [requiredHeaders.join(delimiter)];
 
 fetchedContacts.forEach((contact: { email?: string; customFields?: Record<string, string> }) => {
 const values = requiredHeaders.map((h) => {
 const mappedListField = fieldMapping[h];
 if (!mappedListField) return ""; // Not mapped

 if (mappedListField.toLowerCase() === "email") {
 return contact.email || "";
 }
 
 return contact.customFields?.[mappedListField] || "";
 });
 rows.push(values.join(delimiter));
 });
 
 setRecipientsText(rows.join("\n"), templates);
 toast.success(`Imported ${fetchedContacts.length} contacts from list`);
 setInputMode("table");
 setIsMappingDrawerOpen(false);
 };

 const handleSave = async () => {
 if (
 !name ||
 !templateId ||
 !accountIds ||
 accountIds.length === 0 ||
 !isValid
 )
 return;

 try {
 const url = campaignId ? `/api/campaigns/${campaignId}` : "/api/campaigns";
 const method = campaignId ? "PUT" : "POST";
 
 const res = await fetch(url, {
 method,
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 name,
 templateId,
 emailAccountIds: accountIds,
 recipients: parsedRecipients,
 templateVariants,
 scheduledAt,
 pacingType,
 }),
 });

 const data = await res.json();

 if (!res.ok) {
 throw new Error(data.error || `Failed to ${campaignId ? 'update' : 'create'} campaign`);
 }

 const createdCampaignId = campaignId || data.id;

 // Handle sequence steps
 if (sequenceSteps && sequenceSteps.length > 0) {
 // If updating, delete existing steps first (simple approach)
 if (campaignId) {
 const existing = await fetch(`/api/campaigns/${createdCampaignId}/sequence`).then(r => r.json());
 if (Array.isArray(existing)) {
 for (const step of existing) {
 await fetch(`/api/campaigns/${createdCampaignId}/sequence`, {
 method: 'DELETE',
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ stepId: step.id })
 });
 }
 }
 }
 for (const step of sequenceSteps) {
 await fetch(`/api/campaigns/${createdCampaignId}/sequence`, {
 method: 'POST',
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(step)
 });
 }
 }

 if (!campaignId) resetDraft();
 toast.success(`Campaign ${campaignId ? 'updated' : 'created'} successfully!`);
 router.push(`/campaigns/${campaignId ? campaignId : data.id}`);
 } catch (_err: unknown) {
 const err = _err as Error;
 toast.error(err.message);
 setGlobalError(err.message);
 }
 };

 if (loading) return <PageSkeleton />;

 return (
 <div className="skeu-page">
 <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
 <h1 className="text-xl font-semibold text-text-primary">
 {campaignId ? "Edit Campaign" : "New Campaign"}
 </h1>

 <div className="flex gap-4 mb-8 overflow-x-auto whitespace-nowrap pb-2 scrollbar-hide">
 <div
 className={`flex-1 p-3 text-center border-b-2 font-medium ${step === 1 ? "border-primary-base text-primary-base" : "border-transparent text-text-muted"}`}
 >
 1. Details
 </div>
 <div
 className={`flex-1 p-3 text-center border-b-2 font-medium ${step === 2 ? "border-primary-base text-primary-base" : "border-transparent text-text-muted"}`}
 >
 2. Recipients
 </div>
 <div
 className={`flex-1 p-3 text-center border-b-2 font-medium ${step === 3 ? "border-primary-base text-primary-base" : "border-transparent text-text-muted"}`}
 >
 3. A/B Variants
 </div>
 <div
 className={`flex-1 p-3 text-center border-b-2 font-medium ${step === 4 ? "border-primary-base text-primary-base" : "border-transparent text-text-muted"}`}
 >
 4. Follow-ups
 </div>
 </div>

 {step === 1 && (
 <div className="skeu-card space-y-4">
 <div>
 <label className="block text-sm font-medium mb-1">
 Campaign Name
 </label>
 <input
 className="skeu-input"
 value={name}
 onChange={(e) =>
 setDetails(e.target.value, templateId, accountIds)
 }
 placeholder="Q3 Outreach"
 />
 </div>
 <div>
 <label className="block text-sm font-medium mb-2">
 Email Account(s)
 </label>
 {accounts.length === 0 ? (
 <div className="p-4 text-center border border-dashed border-border-subtle rounded-lg bg-bg-subtle text-text-muted text-sm">
 No active email accounts found. Please connect an account first.
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {accounts.map((a) => {
 const isSelected = accountIds.includes(a.id);
 return (
 <button
 key={a.id}
 type="button"
 onClick={() => {
 const newIds = isSelected
 ? accountIds.filter((id) => id !== a.id)
 : [...accountIds, a.id];
 setDetails(name, templateId, newIds);
 }}
 className={`w-full flex items-center justify-between p-3 border rounded-lg text-left transition-all cursor-pointer ${
 isSelected
 ? "border-primary-base bg-bg-subtle ring-1 ring-primary-base"
 : "border-border-subtle hover:border-text-muted bg-bg-base"
 }`}
 >
 <div>
 <div className="font-semibold text-sm text-text-primary">
 {a.label}
 </div>
 <div className="text-xs text-text-muted">
 {a.fromEmail}
 </div>
 </div>
 <div
 className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
 isSelected
 ? "border-primary-base bg-primary-base text-primary-text"
 : "border-border-subtle"
 }`}
 >
 {isSelected && <span className="text-[10px] font-bold">✓</span>}
 </div>
 </button>
 );
 })}
 </div>
 )}
 </div>
 <div>
 <label className="block text-sm font-medium mb-1">Template</label>
 {templates.length === 0 ? (
 <div className="p-4 text-center border border-dashed border-border-subtle rounded-lg bg-bg-subtle text-text-muted text-sm flex flex-col items-center gap-3">
 <span>No templates found. Please create a template first to start a campaign.</span>
 <Button
 variant="primary"
 type="button"
 onClick={() => router.push("/templates")}
 >
 Create Template
 </Button>
 </div>
 ) : (
 <Select
 value={templateId || "none"}
 onValueChange={(val) => {
 if (val === "create_new") {
 router.push("/templates/new");
 return;
 }
 setDetails(name, val === "none" ? "" : val, accountIds);
 }}
 >
 <SelectTrigger className="skeu-select bg-bg-base">
 <SelectValue placeholder="Select Template" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">Select Template</SelectItem>
 {templates.map((t) => (
 <SelectItem key={t.id} value={t.id}>
 {t.name}
 </SelectItem>
 ))}
 <SelectItem value="create_new" className="text-primary-base font-medium border-t mt-1 pt-1">
 + Create new template
 </SelectItem>
 </SelectContent>
 </Select>
 )}
 </div>

 {/* Sending Pacing */}
 <div>
 <h3 className="font-semibold text-sm mb-3">Sending Pacing</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <button
 type="button"
 onClick={() => setPacingType('SLOW')}
 className={`p-4 rounded-xl border text-left transition-all ${pacingType === 'SLOW' ? 'border-primary-base bg-primary-base/5 shadow-[0_0_10px_rgba(var(--primary-base),0.2)]' : 'border-border-subtle bg-bg-base hover:border-border-strong'}`}
 >
 <div className="flex items-center gap-2 mb-2">
 <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${pacingType === 'SLOW' ? 'border-primary-base' : 'border-border-strong'}`}>
 {pacingType === 'SLOW' && <div className="w-2 h-2 rounded-full bg-primary-base" />}
 </div>
 <span className="font-semibold text-sm text-text-primary">Slow Drip (Recommended)</span>
 </div>
 <p className="text-xs text-text-muted ml-6">
 Emails are randomly sent over a 4-hour period to mimic natural human behavior. Best for deliverability and avoiding spam filters.
 </p>
 </button>
 
 <button
 type="button"
 onClick={() => setPacingType('FAST')}
 className={`p-4 rounded-xl border text-left transition-all ${pacingType === 'FAST' ? 'border-primary-base bg-primary-base/5 shadow-[0_0_10px_rgba(var(--primary-base),0.2)]' : 'border-border-subtle bg-bg-base hover:border-border-strong'}`}
 >
 <div className="flex items-center gap-2 mb-2">
 <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${pacingType === 'FAST' ? 'border-primary-base' : 'border-border-strong'}`}>
 {pacingType === 'FAST' && <div className="w-2 h-2 rounded-full bg-primary-base" />}
 </div>
 <span className="font-semibold text-sm text-text-primary">Fast Send</span>
 </div>
 <p className="text-xs text-text-muted ml-6">
 Sends emails instantly. Best for internal announcements or opted-in newsletters, but carries a higher risk of spam filtering for cold outreach.
 </p>
 </button>
 </div>
 </div>

 <div className="pt-4 flex justify-end">
 <Button
 variant="primary"
 onClick={() => setStep(2)}
 disabled={
 !name || !templateId || !accountIds || accountIds.length === 0
 }
 >
 Next Step
 </Button>
 </div>
 </div>
 )}

 {step === 2 && (
 <div className="space-y-6">
 <div className="skeu-card relative">
 <div className="flex flex-col xl:flex-row justify-between xl:items-start mb-6 gap-4">
 <div>
 <h2 className="text-lg font-semibold mb-2">Enter Recipients</h2>
 <div className="flex flex-wrap gap-2 mb-4 bg-bg-subtle p-1 rounded items-center">
 <Button
 variant="none"
 className={`px-4 py-2 text-sm font-medium rounded flex items-center gap-2 transition ${inputMode === "table" ? "bg-bg-base -sm text-text-primary" : "text-text-muted hover:text-text-primary"}`}
 onClick={() => setInputMode("table")}
 >
 <TableIcon size={16} /> Table Form
 </Button>
 <Button
 variant="none"
 className={`px-4 py-2 text-sm font-medium rounded flex items-center gap-2 transition ${inputMode === "paste" ? "bg-bg-base -sm text-text-primary" : "text-text-muted hover:text-text-primary"}`}
 onClick={() => setInputMode("paste")}
 >
 <Type size={16} /> Bulk Paste
 </Button>
 <div className="hidden sm:block w-px h-6 bg-border-subtle mx-1"></div>
 <label className="px-4 py-2 text-sm font-medium rounded flex items-center gap-2 transition text-primary-base hover:opacity-80 hover:bg-bg-subtle cursor-pointer">
 <Upload size={16} /> Upload CSV
 <input
 type="file"
 accept=".csv"
 className="hidden"
 onChange={handleFileUpload}
 />
 </label>
 <div className="hidden sm:block w-px h-6 bg-border-subtle mx-1"></div>
 <Select onValueChange={handleImportFromAudience}>
 <SelectTrigger className="w-[180px] bg-bg-base skeu-select border-none">
 <SelectValue placeholder="Import from Audience" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">Select List...</SelectItem>
 {audienceLists.map(list => (
 <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 {inputMode === "paste" && (
 <p className="text-sm text-text-muted mb-4">
 Copy and paste data directly from Excel or Google Sheets.
 The columns must match the order below.
 </p>
 )}

 <div className="mb-2">
 <span className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 block">
 Required Column Order
 </span>
 <div className="flex gap-2 flex-wrap">
 {requiredHeaders.map((h) => (
 <span
 key={h}
 className="bg-primary-base/10 text-primary-base border border-primary-base/20 px-3 py-1 rounded text-sm font-mono -sm"
 >
 {h}
 </span>
 ))}
 </div>
 </div>
 </div>
 <Button
 variant="none"
 onClick={() => setRecipientsText("", templates)}
 className="text-xs text-danger-text hover:opacity-80 font-medium px-3 py-1 border border-danger-bg rounded hover:bg-danger-bg/10 transition mt-1"
 >
 Clear Data
 </Button>
 </div>

 {inputMode === "paste" ? (
 <textarea
 className="skeu-textarea w-full font-mono text-sm whitespace-pre"
 rows={10}
 value={recipientsText}
 onChange={(e) => setRecipientsText(e.target.value, templates)}
 placeholder="john@example.com&#9;John&#9;Acme Corp&#10;sarah@example.com&#9;Sarah&#9;Globex"
 />
 ) : (
 <div className="border border-border-subtle rounded-lg overflow-hidden overflow-x-auto">
 <Table>
 <TableHeader className="bg-bg-subtle border-b border-border-subtle">
 <TableRow>
 {requiredHeaders.map((h) => (
 <TableHead
 key={h}
 className="text-xs font-semibold text-text-muted uppercase"
 >
 {h}
 </TableHead>
 ))}
 <TableHead className="w-10"></TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {getTableRows().map((row, i) => (
 <TableRow key={i} className="hover:bg-bg-subtle">
 {requiredHeaders.map((h) => (
 <TableCell key={h} className="p-2">
 <input
 type="text"
 className="w-full p-2 border border-transparent hover:border-border-subtle focus:border-primary-base rounded bg-transparent focus:bg-bg-base transition-colors text-sm"
 placeholder={`Enter ${h}`}
 value={row[h] || ""}
 onChange={(e) =>
 handleTableChange(i, h, e.target.value)
 }
 />
 </TableCell>
 ))}
 <TableCell className="p-2 text-center">
 <Button
 variant="none"
 onClick={() => handleRemoveRow(i)}
 className="text-text-muted hover:text-danger-text p-1"
 >
 <Trash2 size={16} />
 </Button>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 <div className="p-3 bg-bg-subtle border-t border-border-subtle">
 <Button
 variant="none"
 onClick={handleAddRow}
 className="flex items-center gap-1 text-sm font-medium text-primary-base hover:opacity-80"
 >
 <Plus size={16} /> Add Row
 </Button>
 </div>
 </div>
 )}
 </div>

 {parsedRecipients.length > 0 && (
 <div className="skeu-card">
 <div className="flex justify-between items-center mb-4">
 <h2 className="text-lg font-semibold">Preview & Validation</h2>
 {isValid ? (
 <span className="flex items-center text-sm font-medium text-green-600 gap-1">
 <Check size={16} /> Ready to send
 </span>
 ) : (
 <span className="flex items-center text-sm font-medium text-danger-text gap-1">
 <AlertTriangle size={16} /> {globalError}
 </span>
 )}
 </div>

 <div className="overflow-x-auto max-h-96">
 <Table className="relative">
 <TableHeader className="sticky top-0 bg-bg-base z-10 border-b border-border-subtle -sm">
 <TableRow>
 {Object.keys(parsedRecipients[0] || {}).map((k) => (
 <TableHead key={k}>{k}</TableHead>
 ))}
 </TableRow>
 </TableHeader>
 <TableBody>
 {parsedRecipients.map((row, i) => {
 const hasErr = !!validationErrors[i];
 const errs = validationErrors[i] || [];
 const isDup = errs.some((e) => e.includes("Duplicate"));

 let rowClass = "";
 if (hasErr) {
 rowClass = isDup
 ? "border-l-4 border-amber-500 bg-warning-bg"
 : "border-l-4 border-red-500 bg-danger-bg";
 }

 return (
 <TableRow
 key={i}
 className={rowClass}
 title={errs.join(" | ")}
 >
 {Object.keys(row).map((k) => (
 <TableCell
 key={k}
 className={hasErr ? "text-red-900" : ""}
 >
 {row[k]}
 </TableCell>
 ))}
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </div>
 </div>
 )}

 <div className="flex justify-between mt-6">
 <Button variant="ghost" onClick={() => setStep(1)}>
 Back
 </Button>
 <Button
 variant="primary"
 onClick={async () => {
 if (parsedRecipients.length > 0) {
 try {
 const emails = parsedRecipients.map(r => r.email);
 const res = await fetch('/api/campaigns/validate-recipients', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ emails })
 });
 const data = await res.json();
 if (data.suppressed && data.suppressed.length > 0) {
 toast.warning(`${data.suppressed.length} emails are in your suppression list and will be skipped during sending.`);
 }
 } catch (err) {
 console.error('Validation check failed:', err);
 }
 }
 setStep(3);
 }}
 disabled={!isValid}
 >
 Next Step
 </Button>
 </div>
 </div>
 )}

 {step === 3 && (
 <div className="space-y-6">
 <div className="skeu-card">
 <h2 className="text-lg font-semibold mb-2">
 A/B Testing (Optional)
 </h2>
 <p className="text-sm text-text-muted mb-6">
 Create variants of your template to test different subject lines
 or body copy. Our system will distribute them evenly.
 </p>

 {templateVariants.length > 0 ? (
 <div className="space-y-6">
 {templateVariants.map((tv, i) => (
 <div
 key={i}
 className="p-5 border border-border-subtle rounded-xl bg-bg-subtle relative group shadow-sm hover:border-text-muted/30 transition-all duration-200"
 >
 <div className="flex justify-between items-center mb-3">
 <h3 className="font-bold text-sm text-text-primary">
 {tv.name}
 </h3>
 {templateVariants.length > 1 && (
 <Button
 variant="none"
 onClick={() => {
 const newTvs = templateVariants.filter(
 (_, idx) => idx !== i,
 );
 const splits = equalizeSplits(newTvs.length);
 newTvs.forEach(
 (tv, idx) => (tv.splitPercent = splits[idx]),
 );
 setTemplateVariants(newTvs);
 }}
 className="text-text-muted hover:text-danger-text hover:bg-danger-bg/50 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
 >
 <Trash2 size={16} />
 </Button>
 )}
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 items-end">
 {i === 0 ? (
 <div className="md:col-span-10">
 <p className="text-xs text-text-muted pb-2">Uses the base template selected in Step 1 (uneditable)</p>
 </div>
 ) : (
 <div className="md:col-span-10">
 <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
 Load Existing
 </label>
 <select
 className="skeu-select h-[38px] py-1.5 px-3 text-sm bg-bg-base"
 value="none"
 onChange={(e) => {
 const val = e.target.value;
 if (val === "none") return;
 const t = templates.find((temp) => temp.id === val);
 if (t) {
 const newTvs = [...templateVariants];
 newTvs[i].body = t.body;
 if (newTvs[i].subjectVariants.length > 0) {
 newTvs[i].subjectVariants[0].subject =
 t.subject;
 }
 setTemplateVariants(newTvs);
 }
 }}
 >
 <option value="none">Select template...</option>
 {templates.map((t) => (
 <option key={t.id} value={t.id}>
 {t.name}
 </option>
 ))}
 </select>
 </div>
 )}
 
 <div className="md:col-span-2">
 <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
 Split %
 </label>
 <div className="relative">
 <input
 type="number"
 className="skeu-input py-1.5 px-3 pr-6 text-sm bg-bg-base"
 value={tv.splitPercent}
 onChange={(e) => {
 const newTvs = [...templateVariants];
 newTvs[i].splitPercent =
 parseInt(e.target.value) || 0;
 setTemplateVariants(newTvs);
 }}
 />
 <span className="absolute right-3 top-2 text-text-muted text-xs font-semibold">
 %
 </span>
 </div>
 </div>
 </div>

 <div className="mb-6">
 <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
 Body Text
 </label>
 <textarea
 className="skeu-textarea text-sm bg-bg-base disabled:opacity-75 disabled:bg-bg-subtle"
 rows={3}
 value={tv.body}
 disabled={i === 0}
 onChange={(e) => {
 const newTvs = [...templateVariants];
 newTvs[i].body = e.target.value;
 setTemplateVariants(newTvs);
 }}
 placeholder="Hi {{firstName}}, ..."
 />
 </div>

 {selectedTemplate &&
 Array.isArray(selectedTemplate.attachments) &&
 selectedTemplate.attachments.length > 0 && (
 <div className="mb-6">
 <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
 Attachments
 </label>
 <div className="flex flex-wrap gap-2 p-3 bg-bg-base border border-border-subtle rounded-xl">
 {selectedTemplate.attachments.map((att, attIdx: number) => (
 <span
 key={attIdx}
 className="inline-flex items-center px-2.5 py-1 rounded bg-bg-subtle border border-border-subtle text-xs font-mono text-text-muted"
 >
 {att.filename}
 </span>
 ))}
 </div>
 </div>
 )}

 <div className="bg-bg-base p-4 rounded-xl border border-border-subtle shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
 <div className="flex justify-between items-center mb-3">
 <h4 className="font-bold text-xs text-text-primary uppercase tracking-wider">
 Subject Line Variants
 </h4>
 <Button
 variant="none"
 onClick={() => {
 const newTvs = [...templateVariants];
 newTvs[i].subjectVariants.push({
 name: `Subject ${newTvs[i].subjectVariants.length + 1}`,
 subject: "",
 splitPercent: 0,
 });
 const splits = equalizeSplits(
 newTvs[i].subjectVariants.length,
 );
 newTvs[i].subjectVariants.forEach(
 (sv, idx) => (sv.splitPercent = splits[idx]),
 );
 setTemplateVariants(newTvs);
 }}
 className="text-xs font-semibold text-text-primary border border-border-subtle rounded-md px-2.5 py-1.5 hover:bg-bg-subtle active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1"
 >
 <Plus size={14} /> Add Subject
 </Button>
 </div>
 <div className="space-y-3">
 {tv.subjectVariants.map((sv, j) => (
 <div
 key={j}
 className="flex gap-3 items-center group/sub"
 >
 <input
 className="skeu-input py-1.5 px-3 text-sm flex-1 bg-bg-base disabled:opacity-75 disabled:bg-bg-subtle"
 value={sv.subject}
 disabled={i === 0 && j === 0}
 onChange={(e) => {
 const newTvs = [...templateVariants];
 newTvs[i].subjectVariants[j].subject =
 e.target.value;
 setTemplateVariants(newTvs);
 }}
 placeholder="Quick question..."
 />
 <div className="w-24 relative shrink-0">
 <input
 type="number"
 className="skeu-input py-1.5 px-3 pr-6 text-sm bg-bg-base"
 value={sv.splitPercent}
 onChange={(e) => {
 const newTvs = [...templateVariants];
 newTvs[i].subjectVariants[j].splitPercent =
 parseInt(e.target.value) || 0;
 setTemplateVariants(newTvs);
 }}
 />
 <span className="absolute right-3 top-2 text-text-muted text-xs font-semibold">
 %
 </span>
 </div>
 {j > 0 && (
 <Button
 variant="none"
 onClick={() => {
 const newTvs = [...templateVariants];
 newTvs[i].subjectVariants = newTvs[
 i
 ].subjectVariants.filter(
 (_, sIdx) => sIdx !== j,
 );
 const splits = equalizeSplits(
 newTvs[i].subjectVariants.length,
 );
 newTvs[i].subjectVariants.forEach(
 (sv, idx) => (sv.splitPercent = splits[idx]),
 );
 setTemplateVariants(newTvs);
 }}
 className="text-text-muted hover:text-danger-text hover:bg-danger-bg/50 p-1.5 rounded-md opacity-0 group-hover/sub:opacity-100 transition-all duration-200 cursor-pointer shrink-0"
 >
 <Trash2 size={16} />
 </Button>
 )}
 </div>
 ))}
 {tv.subjectVariants.length === 0 && (
 <p className="text-xs text-danger-text font-medium">
 You must add at least one subject line variant.
 </p>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="p-8 text-center border border-dashed border-border-subtle rounded-xl text-text-muted bg-bg-subtle/50">
 <p className="font-semibold text-text-primary mb-1">
 No variants added.
 </p>
 <p className="text-sm">
 The default template and subject line will be used for all
 recipients.
 </p>
 </div>
 )}

 <div className="mt-8 flex justify-center">
 <Button
 variant="none"
 onClick={() => {
 const newTvs = [
 ...templateVariants,
 {
 name: `Variant ${String.fromCharCode(65 + templateVariants.length)}`,
 body: selectedTemplate?.body || "",
 splitPercent: 0,
 subjectVariants: [
 {
 name: "Subject 1",
 subject: selectedTemplate?.subject || "",
 splitPercent: 100,
 },
 ],
 },
 ];
 const splits = equalizeSplits(newTvs.length);
 newTvs.forEach((tv, idx) => (tv.splitPercent = splits[idx]));
 setTemplateVariants(newTvs);
 }}
 className="skeu-btn-ghost flex items-center gap-1.5 font-medium px-4 py-2 border border-dashed border-border-subtle"
 >
 <Plus size={16} /> Add Template Variant
 </Button>
 </div>
 </div>

 <div className="flex justify-between mt-6">
 <Button variant="ghost" onClick={() => setStep(2)}>
 Back
 </Button>
 <Button variant="primary" onClick={() => setStep(4)}>
 Next Step
 </Button>
 </div>
 </div>
 )}

 {step === 4 && (
 <div className="space-y-6">
 <div className="skeu-card">
 <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 mb-6">
 <div>
 <h2 className="text-lg font-semibold mb-1">Follow-up Sequences</h2>
 <p className="text-sm text-text-muted">{"Automatically follow up if they don't reply."}</p>
 </div>
 <Button 
 variant="none" 
 className="skeu-btn-ghost flex items-center gap-2 border border-dashed border-border-subtle"
 onClick={() => {
 const newSteps = [...sequenceSteps, { stepIndex: sequenceSteps.length + 1, delayDays: 3, subject: '', body: '' }];
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
 <label className="block text-xs font-bold text-text-muted uppercase mb-1">Ideal Customer Profile (ICP)</label>
 <input 
 type="text" 
 className="skeu-input w-full text-sm h-9" 
 placeholder="e.g. VPs of Sales at B2B SaaS"
 value={aiSequenceOptions.icp}
 onChange={(e) => setAiSequenceOptions({ ...aiSequenceOptions, icp: e.target.value })}
 />
 </div>
 <div>
 <label className="block text-xs font-bold text-text-muted uppercase mb-1">Offer / Value Prop</label>
 <input 
 type="text" 
 className="skeu-input w-full text-sm h-9" 
 placeholder="e.g. Save 10 hours a week on prospecting"
 value={aiSequenceOptions.offer}
 onChange={(e) => setAiSequenceOptions({ ...aiSequenceOptions, offer: e.target.value })}
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
 <div key={idx} className="p-5 border border-border-subtle rounded-xl bg-bg-subtle relative group shadow-sm">
 <Button
 variant="none"
 onClick={() => {
 const newSteps = sequenceSteps.filter((_, i) => i !== idx);
 // Re-index
 newSteps.forEach((s, i) => s.stepIndex = i + 1);
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
 <label className="block text-xs font-bold text-text-muted uppercase mb-1">Subject</label>
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
 <label className="block text-xs font-bold text-text-muted uppercase mb-1">Body</label>
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
 <h3 className="text-sm font-semibold mb-3">Schedule Campaign (Optional)</h3>
 <p className="text-sm text-text-muted mb-3">Leave blank to send immediately, or pick a date/time to schedule it.</p>
 <input 
 type="datetime-local" 
 className="skeu-input bg-bg-base px-3 py-2 text-sm"
 value={scheduledAt || ''}
 onChange={(e) => setScheduledAt(e.target.value || null)}
 />
 </div>

 <div className="flex justify-between mt-6">
 <Button variant="ghost" onClick={() => setStep(3)}>
 Back
 </Button>
 <Button variant="primary" onClick={handleSave}>
 {campaignId ? "Save Changes" : "Launch Campaign"}
 </Button>
 </div>
 </div>
 )}
 </div>

 <Drawer open={isMappingDrawerOpen} onOpenChange={setIsMappingDrawerOpen} direction="right">
 <DrawerContent className="inset-y-0 right-0 h-full w-full sm:max-w-md rounded-none sm:rounded-l-xl border-l border-border-subtle bg-bg-base p-6 shadow-2xl flex flex-col overflow-hidden text-text-primary mt-0 top-0 left-auto bottom-0">
 <DrawerHeader className="px-0 pt-0 pb-4 border-b border-border-subtle flex flex-col gap-1 text-left shrink-0">
 <DrawerTitle className="text-lg font-semibold text-text-primary">
 Map Audience Fields
 </DrawerTitle>
 <DrawerDescription className="text-xs text-text-muted">
 Match the variables required by your email template to the fields in the imported list.
 </DrawerDescription>
 </DrawerHeader>
 
 <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2 custom-scrollbar">
 {isFetchingList ? (
 <div className="flex flex-col items-center justify-center h-40 space-y-4">
 <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
 <span className="text-sm text-text-muted">Fetching audience list...</span>
 </div>
 ) : (
 <div className="space-y-4">
 {requiredHeaders.map((header) => (
 <div key={header} className="flex flex-col space-y-2">
 <label className="text-sm font-semibold capitalize">
 {header}
 </label>
 <Select
 value={fieldMapping[header] || ""}
 onValueChange={(val) => setFieldMapping(prev => ({ ...prev, [header]: val }))}
 >
 <SelectTrigger className="skeu-input bg-bg-subtle border-border-subtle">
 <SelectValue placeholder="Select list field" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">
 <span className="text-text-muted italic">-- Leave blank --</span>
 </SelectItem>
 {availableListFields.map((field) => (
 <SelectItem key={field} value={field}>
 {field}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 ))}
 </div>
 )}
 </div>
 
 <DrawerFooter className="px-0 pb-0 pt-4 border-t border-border-subtle shrink-0">
 <div className="flex gap-2 justify-end w-full">
 <Button variant="ghost" onClick={() => setIsMappingDrawerOpen(false)} disabled={isFetchingList}>
 Cancel
 </Button>
 <Button variant="primary" onClick={confirmListImport} disabled={isFetchingList}>
 Confirm Import
 </Button>
 </div>
 </DrawerFooter>
 </DrawerContent>
 </Drawer>
 </div>
 );
}
