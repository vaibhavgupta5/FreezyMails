import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Trash2,
  Plus,
  Type,
  Table as TableIcon,
  Upload,
  X,
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

type FilterRule = {
  id: string;
  field: string;
  operator: "is" | "is_not" | "contains" | "not_contains" | "is_empty" | "is_not_empty";
  value: string;
};

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
  const [customFilters, setCustomFilters] = useState<FilterRule[]>([]);
  const [filterLogic, setFilterLogic] = useState<"AND" | "OR">("AND");
  const [lastEdited, setLastEdited] = useState<{row: number, col: string} | null>(null);

  useEffect(() => {
    if (lastEdited) {
      const t = setTimeout(() => setLastEdited(null), 1000);
      return () => clearTimeout(t);
    }
  }, [lastEdited]);

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
    setLastEdited({ row: rowIndex, col: header });
  };

  const handleAddRow = () => {
    const rows = getTableRows();
    const newRow: Record<string, string> = {};
    requiredHeaders.forEach((h) => {
      newRow[h] = headerFallbacks[h] || "";
    });
    rows.push(newRow);
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

  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = 'target' in e ? e.target.files?.[0] : e;
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          toast.error("CSV is empty or invalid");
          return;
        }

        const rawRows = results.data as Record<string, string>[];
        const extractedFields = Object.keys(rawRows[0] || {});
        
        const csvContacts = rawRows.map(row => {
          const emailKey = Object.keys(row).find(k => k.toLowerCase() === 'email');
          return {
            email: emailKey ? row[emailKey] : undefined,
            customFields: row,
            sentStatus: "NOT_SENT"
          };
        });

        setFetchedContacts(csvContacts);
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
        setImportCondition("all");
        setIsMappingDrawerOpen(true);
        if ('target' in e) {
          e.target.value = ''; // Reset input
        }
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

  const evaluateContact = (contact: { email?: string; customFields?: Record<string, string>; sentStatus?: string }) => {
    if (importCondition === "unsent" && contact.sentStatus !== "NOT_SENT") return false;
    if (importCondition === "sent" && contact.sentStatus !== "SENT") return false;

    if (customFilters.length === 0) return true;

    const results = customFilters.map((filter) => {
      let contactValue = "";
      if (filter.field.toLowerCase() === "email") {
        contactValue = contact.email || "";
      } else if (filter.field === "sentStatus") {
        contactValue = contact.sentStatus || "";
      } else {
        contactValue = contact.customFields?.[filter.field] || "";
      }
      
      const v1 = contactValue.toLowerCase();
      const v2 = filter.value.toLowerCase();

      switch (filter.operator) {
        case "is": return v1 === v2;
        case "is_not": return v1 !== v2;
        case "contains": return v1.includes(v2);
        case "not_contains": return !v1.includes(v2);
        case "is_empty": return v1.trim() === "";
        case "is_not_empty": return v1.trim() !== "";
        default: return true;
      }
    });

    return filterLogic === "AND" ? results.every((r) => r) : results.some((r) => r);
  };

  const confirmListImport = () => {
    const delimiter = "\t";
    const rows = [requiredHeaders.join(delimiter)];

    const contactsToImport = fetchedContacts.filter(evaluateContact);

    contactsToImport.forEach(
      (contact: { email?: string; customFields?: Record<string, string>; sentStatus?: string }) => {
        const values = requiredHeaders.map((h) => {
          const mappedListField = fieldMapping[h];
          if (!mappedListField) return headerFallbacks[h] || "";

          if (mappedListField.toLowerCase() === "email") {
            return contact.email || headerFallbacks[h] || "";
          }

          return contact.customFields?.[mappedListField] || headerFallbacks[h] || "";
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
      <div 
        className={`space-y-6 transition-colors ${isDragging ? "ring-2 ring-primary-base rounded-xl bg-primary-base/5" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type === "text/csv" || file.name.endsWith(".csv")) {
              handleFileUpload(file);
            } else {
              toast.error("Please drop a valid CSV file");
            }
          }
        }}
      >
        <div className="skeu-card relative pointer-events-auto">
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
                      {requiredHeaders.map((h) => {
                        const isRecentlyEdited = lastEdited?.row === i && lastEdited?.col === h;
                        return (
                        <TableCell key={h} className="p-2">
                          <input
                            type="text"
                            className={`w-full p-2 border border-transparent hover:border-border-subtle focus:border-primary-base rounded transition-colors text-sm placeholder:text-text-muted/60 ${isRecentlyEdited ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-transparent focus:bg-bg-base'}`}
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
                        );
                      })}
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
        <DrawerContent 
          className="inset-y-0 right-0 h-full w-full sm:max-w-md rounded-none border-l border-border-subtle bg-bg-base p-6 shadow-2xl flex flex-col overflow-hidden text-text-primary mt-0 top-0 left-auto bottom-0"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
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
                <div className="space-y-4 px-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-text-primary">Advanced Filters</h3>
                    <Button variant="none" size="sm" onClick={() => setCustomFilters([...customFilters, { id: Math.random().toString(), field: "email", operator: "is", value: "" }])} className="text-xs text-primary-base hover:opacity-80 flex items-center gap-1 px-2 py-1"><Plus size={14} /> Add Filter</Button>
                  </div>
                  {customFilters.length > 0 && (
                    <div className="space-y-3">
                      {customFilters.map((filter, index) => (
                        <div key={filter.id} className="flex flex-col gap-2 p-3 border border-border-subtle rounded bg-bg-base">
                          <div className="flex items-center gap-2">
                            <Select value={filter.field} onValueChange={(val) => {
                              const newFilters = [...customFilters];
                              newFilters[index].field = val;
                              setCustomFilters(newFilters);
                            }}>
                              <SelectTrigger className="flex-1 bg-bg-base text-xs h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="email">email</SelectItem>
                                <SelectItem value="sentStatus">sentStatus</SelectItem>
                                {availableListFields.filter(f => f.toLowerCase() !== "email").map(f => (
                                  <SelectItem key={f} value={f}>{f}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={filter.operator} onValueChange={(val: "is" | "is_not" | "contains" | "not_contains" | "is_empty" | "is_not_empty") => {
                              const newFilters = [...customFilters];
                              newFilters[index].operator = val;
                              setCustomFilters(newFilters);
                            }}>
                              <SelectTrigger className="w-[110px] bg-bg-base text-xs h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="is">is</SelectItem>
                                <SelectItem value="is_not">is not</SelectItem>
                                <SelectItem value="contains">contains</SelectItem>
                                <SelectItem value="not_contains">not contains</SelectItem>
                                <SelectItem value="is_empty">is empty</SelectItem>
                                <SelectItem value="is_not_empty">is not empty</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-danger-text shrink-0" onClick={() => setCustomFilters(customFilters.filter((_, i) => i !== index))}><X size={14} /></Button>
                          </div>
                          {filter.operator !== "is_empty" && filter.operator !== "is_not_empty" && (
                            <input 
                              type="text" 
                              value={filter.value} 
                              onChange={(e) => {
                                const newFilters = [...customFilters];
                                newFilters[index].value = e.target.value;
                                setCustomFilters(newFilters);
                              }}
                              className="w-full text-xs p-1.5 border border-border-subtle rounded focus:border-primary-base focus:outline-none bg-bg-base text-text-primary placeholder:text-text-muted" 
                              placeholder="Value..." 
                            />
                          )}
                        </div>
                      ))}
                      {customFilters.length > 1 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-text-muted">Match:</span>
                          <Select value={filterLogic} onValueChange={(val: "AND" | "OR") => setFilterLogic(val)}>
                            <SelectTrigger className="w-[80px] h-7 text-xs bg-bg-base"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AND">ALL (AND)</SelectItem>
                              <SelectItem value="OR">ANY (OR)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
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
              Confirm Import ({fetchedContacts.filter(evaluateContact).length} contacts)
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
