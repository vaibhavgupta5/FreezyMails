import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Trash2,
  Plus,
  Type,
  Table as TableIcon,
  Upload,
} from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { useCampaignStore } from "@/stores/useCampaignStore";
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
import { CampaignWizardTemplate } from "./Step1Details";

export default function Step2Recipients({
  templates,
  audienceLists,
}: {
  templates: CampaignWizardTemplate[];
  audienceLists: { id: string; name: string }[];
}) {
  const {
    step,
    setStep,
    inputMode,
    setInputMode,
    templateId,
    recipientsText,
    setRecipientsText,
    parsedRecipients,
    validationErrors,
    isValid,
    globalError,
  } = useCampaignStore();

  const [isMappingDrawerOpen, setIsMappingDrawerOpen] = useState(false);
  const [isFetchingList, setIsFetchingList] = useState(false);
  const [fetchedContacts, setFetchedContacts] = useState<
    { email?: string; customFields?: Record<string, string>; sentStatus?: string }[]
  >([]);
  const [availableListFields, setAvailableListFields] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importCondition, setImportCondition] = useState<"all" | "unsent" | "sent">("all");

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const requiredHeaders = ["email"];
  const headerFallbacks: Record<string, string> = {};

  if (selectedTemplate && Array.isArray(selectedTemplate.variables)) {
    selectedTemplate.variables.forEach((v) => {
      if (typeof v === "string") {
        requiredHeaders.push(v);
      } else if (typeof v === "object" && v !== null && "name" in v) {
        const varObj = v as { name: string; fallback?: string };
        requiredHeaders.push(varObj.name);
        if (varObj.fallback) {
          headerFallbacks[varObj.name] = varObj.fallback;
        }
      }
    });
  }

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
        const rows = [requiredHeaders.join(delimiter)];

        (results.data as Record<string, string>[]).forEach((row) => {
          const values = requiredHeaders.map((h) => {
            const matchedKey = Object.keys(row).find(
              (k) => k.toLowerCase() === h.toLowerCase(),
            );
            return matchedKey ? row[matchedKey] : "";
          });
          rows.push(values.join(delimiter));
        });

        setRecipientsText(rows.join("\n"), templates);
        toast.success(`Imported ${results.data.length} rows`);
        setInputMode("table");
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
    setImportCondition("all");
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

      const fieldsSet = new Set<string>();
      fieldsSet.add("email");

      data.contacts.forEach(
        (contact: {
          email?: string;
          customFields?: Record<string, string>;
        }) => {
          if (contact.customFields) {
            Object.keys(contact.customFields).forEach((k) => fieldsSet.add(k));
          }
        },
      );
      const extractedFields = Array.from(fieldsSet);
      setAvailableListFields(extractedFields);

      const initialMapping: Record<string, string> = {};
      requiredHeaders.forEach((h) => {
        const match = extractedFields.find(
          (f) => f.toLowerCase() === h.toLowerCase(),
        );
        if (match) {
          initialMapping[h] = match;
        }
      });
      setFieldMapping(initialMapping);
    } catch (_err: unknown) {
      const err = _err as Error;
      toast.error(err.message);
      setIsMappingDrawerOpen(false);
    } finally {
      setIsFetchingList(false);
    }
  };

  const confirmListImport = () => {
    const delimiter = "\t";
    const rows = [requiredHeaders.join(delimiter)];

    const contactsToImport = fetchedContacts.filter((c) => {
      if (importCondition === "unsent") return c.sentStatus === "NOT_SENT";
      if (importCondition === "sent") return c.sentStatus === "SENT";
      return true;
    });

    contactsToImport.forEach(
      (contact: { email?: string; customFields?: Record<string, string>; sentStatus?: string }) => {
        const values = requiredHeaders.map((h) => {
          const mappedListField = fieldMapping[h];
          if (!mappedListField) return "";

          if (mappedListField.toLowerCase() === "email") {
            return contact.email || "";
          }

          return contact.customFields?.[mappedListField] || "";
        });
        rows.push(values.join(delimiter));
      },
    );

    setRecipientsText(rows.join("\n"), templates);
    toast.success(`Imported ${fetchedContacts.length} contacts from list`);
    setInputMode("table");
    setIsMappingDrawerOpen(false);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="skeu-card relative">
          <div className="flex flex-col xl:flex-row justify-between xl:items-start mb-6 gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">Enter Recipients</h2>
              <div className="flex flex-wrap gap-2 mb-4 bg-bg-subtle p-1 rounded items-center">
                <Button
                  variant="none"
                  className={`px-4 py-2 text-sm font-medium rounded flex items-center gap-2 transition ${
                    inputMode === "table"
                      ? "bg-bg-base -sm text-text-primary"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                  onClick={() => setInputMode("table")}
                >
                  <TableIcon size={16} /> Table Form
                </Button>
                <Button
                  variant="none"
                  className={`px-4 py-2 text-sm font-medium rounded flex items-center gap-2 transition ${
                    inputMode === "paste"
                      ? "bg-bg-base -sm text-text-primary"
                      : "text-text-muted hover:text-text-primary"
                  }`}
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
                    {audienceLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {inputMode === "paste" && (
                <p className="text-sm text-text-muted mb-4">
                  Copy and paste data directly from Excel or Google Sheets. The
                  columns must match the order below.
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
                            className="w-full p-2 border border-transparent hover:border-border-subtle focus:border-primary-base rounded bg-transparent focus:bg-bg-base transition-colors text-sm placeholder:text-text-muted/60"
                            placeholder={
                              headerFallbacks[h]
                                ? `Default: ${headerFallbacks[h]}`
                                : `Enter ${h}`
                            }
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
                        {Object.keys(row).map((k) => {
                          const val = row[k as keyof typeof row] as string;
                          const fallback = headerFallbacks[k];
                          const isUsingFallback = !val && fallback;

                          return (
                            <TableCell
                              key={k}
                              className={hasErr ? "text-red-900" : ""}
                            >
                              {isUsingFallback ? (
                                <span className="text-text-muted font-semibold flex items-center gap-1 text-xs">
                                  {fallback}
                                </span>
                              ) : (
                                val
                              )}
                            </TableCell>
                          );
                        })}
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
                  const emails = parsedRecipients.map((r) => r.email);
                  const res = await fetch(
                    "/api/campaigns/validate-recipients",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ emails }),
                    },
                  );
                  const data = await res.json();
                  if (data.suppressed && data.suppressed.length > 0) {
                    toast.warning(
                      `${data.suppressed.length} emails are in your suppression list and will be skipped during sending.`,
                    );
                  }
                } catch (err) {
                  console.error("Validation check failed:", err);
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

      <Drawer
        open={isMappingDrawerOpen}
        onOpenChange={setIsMappingDrawerOpen}
        direction="right"
      >
        <DrawerContent className="inset-y-0 right-0 h-full w-full sm:max-w-md rounded-none sm:rounded-l-xl border-l border-border-subtle bg-bg-base p-6 shadow-2xl flex flex-col overflow-hidden text-text-primary mt-0 top-0 left-auto bottom-0">
          <DrawerHeader className="px-0 pt-0 pb-4 border-b border-border-subtle flex flex-col gap-1 text-left shrink-0">
            <DrawerTitle className="text-lg font-semibold text-text-primary">
              Map Audience Fields
            </DrawerTitle>
            <DrawerDescription className="text-xs text-text-muted">
              Match the columns required by your template with the fields
              available in this audience list.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-5">
            {isFetchingList ? (
              <div className="flex flex-col items-center justify-center h-40 text-text-muted">
                <div className="w-8 h-8 border-4 border-primary-base border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-medium">Loading contacts...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4 px-1">
                  <h3 className="text-sm font-semibold text-text-primary">Import Condition</h3>
                  <Select
                    value={importCondition}
                    onValueChange={(val: "all" | "unsent" | "sent") => setImportCondition(val)}
                  >
                    <SelectTrigger className="bg-bg-base border-border-strong w-full">
                      <SelectValue placeholder="Select filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Contacts ({fetchedContacts.length})</SelectItem>
                      <SelectItem value="unsent">Only Unsent Contacts ({fetchedContacts.filter((c) => c.sentStatus === "NOT_SENT").length})</SelectItem>
                      <SelectItem value="sent">Only Sent Contacts ({fetchedContacts.filter((c) => c.sentStatus === "SENT").length})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <hr className="border-border-subtle" />
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-text-primary px-1">Field Mapping</h3>
                  {requiredHeaders.map((reqField) => (
                  <div
                    key={reqField}
                    className="flex flex-col gap-1.5 p-3 rounded-lg border border-border-subtle bg-bg-subtle"
                  >
                    <label className="text-sm font-semibold text-text-primary flex items-center justify-between">
                      <span>
                        Template Field:{" "}
                        <span className="font-mono text-primary-base">
                          {reqField}
                        </span>
                      </span>
                    </label>
                    <Select
                      value={fieldMapping[reqField] || "none"}
                      onValueChange={(val) => {
                        setFieldMapping((prev) => ({
                          ...prev,
                          [reqField]: val === "none" ? "" : val,
                        }));
                      }}
                    >
                      <SelectTrigger className="bg-bg-base border-border-strong w-full">
                        <SelectValue placeholder="Do not map (leave empty)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="none"
                          className="text-text-muted italic"
                        >
                          Do not map (leave empty)
                        </SelectItem>
                        {availableListFields.map((listField) => (
                          <SelectItem key={listField} value={listField}>
                            {listField}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>

          <DrawerFooter className="px-0 pb-0 pt-4 border-t border-border-subtle shrink-0">
            <Button
              variant="primary"
              className="w-full"
              onClick={confirmListImport}
              disabled={isFetchingList}
            >
              Confirm Import ({fetchedContacts.filter((c) => importCondition === "all" ? true : importCondition === "unsent" ? c.sentStatus === "NOT_SENT" : c.sentStatus === "SENT").length} contacts)
            </Button>
            <Button
              variant="ghost"
              className="w-full mt-2"
              onClick={() => setIsMappingDrawerOpen(false)}
            >
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
