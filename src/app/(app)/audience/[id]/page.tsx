"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  ArrowLeft,
  Trash2,
  Save,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Globe,
  Check,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmPopup from "@/components/ui/ConfirmPopup";

type Contact = {
  id: string;
  email: string;
  customFields: Record<string, string>;
  isNew?: boolean;
  sentStatus?: string;
};

type ExtractedWebRow = {
  url: string;
  normalizedUrl: string;
  email: string;
  allEmails: string[];
  companyName: string;
  personName: string;
  error?: string;
};

export default function AudienceDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [listName, setListName] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Spreadsheet state
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search & Filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterColumn, setFilterColumn] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSentStatus, setFilterSentStatus] = useState("all");

  const activeFiltersCount =
    (filterColumn !== "all" ? 1 : 0) +
    (filterStatus !== "all" ? 1 : 0) +
    (filterSentStatus !== "all" ? 1 : 0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // For Column Dialog
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  // For Web Scraper / Import Dialog
  const [isWebImportOpen, setIsWebImportOpen] = useState(false);
  const [webUrlsInput, setWebUrlsInput] = useState("");
  const [extractingWeb, setExtractingWeb] = useState(false);
  const [extractedWebRows, setExtractedWebRows] = useState<ExtractedWebRow[]>(
    [],
  );

  // Column Mapping state for Web Import
  const [companyColMapping, setCompanyColMapping] =
    useState<string>("CREATE_COMPANY");
  const [nameColMapping, setNameColMapping] = useState<string>("CREATE_NAME");
  const [urlColMapping, setUrlColMapping] = useState<string>("CREATE_URL");

  // Multi-delete & Dialog states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<
    | { type: "single"; contact: Contact }
    | { type: "multi"; ids: string[] }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  // Campaign History Drawer State
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [selectedHistoryEmail, setSelectedHistoryEmail] = useState<
    string | null
  >(null);
  const [historyData, setHistoryData] = useState<
    {
      id: string;
      status: string;
      sentAt?: string;
      createdAt: string;
      campaign?: { name: string; template?: { subject: string; body: string } };
      dynamicData?: Record<string, unknown>;
    }[]
  >([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchList = useCallback(async () => {
    // Prevent synchronous setState warning
    await Promise.resolve();
    try {
      const res = await fetch(`/api/lists/${id}`);
      if (!res.ok) throw new Error("Failed to fetch list");
      const data = await res.json();
      setListName(data.name);

      // Extract unique custom fields
      const customKeys = new Set<string>();
      data.contacts.forEach((c: Contact) => {
        if (c.customFields) {
          Object.keys(c.customFields).forEach((k) => customKeys.add(k));
        }
      });
      setColumns(Array.from(customKeys));

      // Append one empty row at the end for easy insertion
      setContacts([
        ...data.contacts,
        { id: `new-placeholder-${Date.now()}`, email: "", customFields: {}, isNew: true },
      ]);
    } catch {
      toast.error("Error loading list");
      router.push("/audience");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchList();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchList]);

  const batchSave = async (currentContacts: Contact[]) => {
    if (saving) return;
    setSaving(true);

    // Filter out rows that are entirely empty (no email)
    const validContacts = currentContacts.filter((c) => c.email.trim() !== "");

    try {
      const res = await fetch(`/api/lists/${id}/contacts/batch`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: validContacts }),
      });

      if (!res.ok) {
        throw new Error("Failed to save changes");
      }

      toast.success("Changes saved");
      setIsDirty(false);

      // Update local IDs with database IDs, re-fetch to ensure sync
      fetchList();
    } catch (error) {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (isDirty) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        batchSave(contacts);
      }, 20000); // Save every 30 seconds
    }

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [contacts, isDirty]);

  const handleCellChange = (
    contactId: string,
    field: string,
    value: string,
  ) => {
    setContacts((prev) => {
      const updated = prev.map((c) => {
        if (c.id === contactId) {
          if (field === "email") {
            return { ...c, email: value, isNew: false };
          } else {
            return {
              ...c,
              customFields: { ...c.customFields, [field]: value },
              isNew: false,
            };
          }
        }
        return c;
      });

      // If the last row was modified, add a new empty row
      const lastRow = updated[updated.length - 1];
      const isLastRowEmpty =
        lastRow.email === "" &&
        Object.values(lastRow.customFields).every((v) => v === "");

      if (!isLastRowEmpty) {
        updated.push({
          id: `new-placeholder-${Date.now()}`,
          email: "",
          customFields: {},
          isNew: true,
        });
      }

      return updated;
    });
    setIsDirty(true);
  };

  const addColumn = () => {
    const colName = newColumnName.trim();
    if (!colName) {
      toast.error("Column name is required");
      return;
    }
    if (colName.toLowerCase() === "email" || columns.includes(colName)) {
      toast.error("Invalid or duplicate column name");
      return;
    }
    setColumns([...columns, colName]);
    setNewColumnName("");
    setIsColumnDialogOpen(false);
  };

  const deleteColumn = (colName: string) => {
    setColumns((prev) => prev.filter((c) => c !== colName));
    setContacts((prev) =>
      prev.map((c) => {
        const { [colName]: _removed, ...rest } = c.customFields ?? {};
        return { ...c, customFields: rest };
      }),
    );
    setIsDirty(true);
    toast.success(`Column "${colName}" removed`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget || deleting) return;
    setDeleting(true);

    try {
      if (deleteConfirmTarget.type === "single") {
        const contact = deleteConfirmTarget.contact;
        if (contact.isNew || String(contact.id).startsWith("new-")) {
          setContacts(contacts.filter((c) => c.id !== contact.id));
        } else {
          try {
            const res = await fetch(`/api/lists/${id}/contacts/${contact.id}`, {
              method: "DELETE",
            });
            if (!res.ok && res.status !== 404) throw new Error("Failed to delete contact");
          } catch (e) {
            console.warn("API delete failed but continuing locally", e);
          }
          setContacts(contacts.filter((c) => c.id !== contact.id));
          toast.success("Contact deleted");
        }
        setSelectedIds(selectedIds.filter((id) => id !== contact.id));
      } else {
        const ids = deleteConfirmTarget.ids;
        const dbIds = ids.filter((id) => !String(id).startsWith("new-"));

        if (dbIds.length > 0) {
          try {
            const res = await fetch(`/api/lists/${id}/contacts/batch`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: dbIds }),
            });
            if (!res.ok && res.status !== 404) throw new Error("Failed to delete selected contacts");
          } catch (e) {
            console.warn("API batch delete failed but continuing locally", e);
          }
        }

        setContacts(contacts.filter((c) => !ids.includes(c.id)));
        setSelectedIds([]);
        toast.success(`Deleted ${ids.length} contacts`);
      }
    } catch (_err: unknown) {
      const err = _err as Error;
      toast.error(err.message || "Error deleting contact(s)");
    } finally {
      setDeleting(false);
      setDeleteConfirmTarget(null);
    }
  };
  const openHistory = async (email: string) => {
    setSelectedHistoryEmail(email);
    setIsHistoryDrawerOpen(true);
    setLoadingHistory(true);
    setHistoryData([]);

    try {
      const res = await fetch(
        `/api/contacts/history?email=${encodeURIComponent(email)}`,
      );
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      setHistoryData(data.history || []);
    } catch (err) {
      toast.error("Error loading campaign history");
    } finally {
      setLoadingHistory(false);
    }
  };
  // Web Scraper Extraction Handler
  const handleExtractFromWeb = async () => {
    const urls = webUrlsInput
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.length > 3);

    if (urls.length === 0) {
      toast.error("Please enter at least one valid website URL");
      return;
    }

    setExtractingWeb(true);
    try {
      const res = await fetch(`/api/lists/${id}/extract-web`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to extract from websites");
      }

      const data = await res.json();
      setExtractedWebRows(data.extracted || []);

      // Auto-configure initial mappings based on existing table columns
      if (columns.some((c) => c.toLowerCase() === "company")) {
        const match = columns.find((c) => c.toLowerCase() === "company")!;
        setCompanyColMapping(match);
      } else {
        setCompanyColMapping("CREATE_COMPANY");
      }

      if (
        columns.some((c) =>
          ["name", "contact name", "person name", "full name"].includes(
            c.toLowerCase(),
          ),
        )
      ) {
        const match = columns.find((c) =>
          ["name", "contact name", "person name", "full name"].includes(
            c.toLowerCase(),
          ),
        )!;
        setNameColMapping(match);
      } else {
        setNameColMapping("CREATE_NAME");
      }

      if (
        columns.some((c) =>
          ["website", "url", "source"].includes(c.toLowerCase()),
        )
      ) {
        const match = columns.find((c) =>
          ["website", "url", "source"].includes(c.toLowerCase()),
        )!;
        setUrlColMapping(match);
      } else {
        setUrlColMapping("CREATE_URL");
      }

      toast.success(
        `Extracted data from ${data.extracted?.length || 0} websites!`,
      );
    } catch (_error: unknown) {
      const error = _error as Error;
      toast.error(error.message || "Extraction failed");
    } finally {
      setExtractingWeb(false);
    }
  };

  const confirmAndImportWebData = async () => {
    if (extractedWebRows.length === 0) return;

    const updatedColumns = [...columns];
    let targetCompanyCol = companyColMapping;
    let targetNameCol = nameColMapping;
    let targetUrlCol = urlColMapping;

    // Create new columns if requested
    if (companyColMapping === "CREATE_COMPANY") {
      if (!updatedColumns.includes("Company")) updatedColumns.push("Company");
      targetCompanyCol = "Company";
    }
    if (nameColMapping === "CREATE_NAME") {
      const colName = updatedColumns.includes("Person Name")
        ? "Contact Name"
        : "Person Name";
      if (!updatedColumns.includes(colName)) updatedColumns.push(colName);
      targetNameCol = colName;
    }
    if (urlColMapping === "CREATE_URL") {
      if (!updatedColumns.includes("Website")) updatedColumns.push("Website");
      targetUrlCol = "Website";
    }

    setColumns(updatedColumns);

    // Build contact rows
    const newContactItems: Contact[] = extractedWebRows.map((row, idx) => {
      const customFields: Record<string, string> = {};

      if (targetCompanyCol && targetCompanyCol !== "none") {
        customFields[targetCompanyCol] = row.companyName || "";
      }
      if (targetNameCol && targetNameCol !== "none") {
        customFields[targetNameCol] = row.personName || "";
      }
      if (targetUrlCol && targetUrlCol !== "none") {
        customFields[targetUrlCol] = row.url || "";
      }

      return {
        id: `web-${Date.now()}-${idx}`,
        email: row.email || "",
        customFields,
        isNew: false, // Set false so it shows up right away in paginated table
      };
    });

    // Insert new rows right before the last empty placeholder row
    const existingRegular = contacts.filter(
      (c) =>
        !c.isNew ||
        c.email !== "" ||
        Object.values(c.customFields).some((v) => v !== ""),
    );
    const lastPlaceholder = contacts.find(
      (c) =>
        c.isNew &&
        c.email === "" &&
        Object.values(c.customFields).every((v) => v === ""),
    ) || {
      id: `new-${Date.now()}`,
      email: "",
      customFields: {},
      isNew: true,
    };

    const updatedList = [
      ...existingRegular,
      ...newContactItems,
      lastPlaceholder,
    ];
    setContacts(updatedList);
    setIsDirty(true);
    setIsWebImportOpen(false);
    setExtractedWebRows([]);
    setWebUrlsInput("");
    toast.success(
      `Imported ${newContactItems.length} contacts into table! Saving...`,
    );

    // Immediately trigger batch save so the new items get real DB IDs and persist permanently
    await batchSave(updatedList);
  };

  if (loading)
    return (
      <div className="skeu-page h-[100dvh] w-full flex flex-col p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center pb-4 border-b border-border-subtle">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>

        {/* Toolbar Skeleton */}
        <div className="flex justify-between items-center bg-bg-base p-2.5 rounded-lg border border-border-subtle">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-56 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="border border-border-subtle rounded-lg overflow-hidden flex-1">
          <div className="h-10 border-b border-border-subtle bg-bg-base flex items-center px-4 gap-4">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
          </div>
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="h-12 border-b border-border-subtle flex items-center px-4 gap-4"
            >
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    );

  const validContactCount = contacts.filter(
    (c) => c.email.trim() !== "",
  ).length;

  // Filter & Search Logic
  const filteredContacts = contacts.filter((c) => {
    if (c.isNew) return true; // Keep the new row available

    // Status filter
    if (filterStatus === "populated") {
      const hasAllFields =
        c.email.trim() !== "" &&
        columns.every((col) => (c.customFields[col] || "").trim() !== "");
      if (!hasAllFields) return false;
    } else if (filterStatus === "empty") {
      const hasSomeEmpty =
        c.email.trim() === "" ||
        columns.some((col) => (c.customFields[col] || "").trim() === "");
      if (!hasSomeEmpty) return false;
    }

    // Sent Status filter
    if (filterSentStatus !== "all") {
      if (filterSentStatus === "SENT" && c.sentStatus !== "SENT") return false;
      if (filterSentStatus === "PENDING" && c.sentStatus !== "PENDING")
        return false;
      if (
        filterSentStatus === "NOT_SENT" &&
        (c.sentStatus === "SENT" ||
          c.sentStatus === "PENDING" ||
          c.sentStatus === "BOUNCED" ||
          c.sentStatus === "FAILED")
      )
        return false;
    }

    // Search text & Column filter
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();

    if (filterColumn === "all") {
      const emailMatches = c.email.toLowerCase().includes(query);
      const customMatches = Object.values(c.customFields).some((val) =>
        (val || "").toLowerCase().includes(query),
      );
      return emailMatches || customMatches;
    } else if (filterColumn === "email") {
      return c.email.toLowerCase().includes(query);
    } else {
      return (c.customFields[filterColumn] || "").toLowerCase().includes(query);
    }
  });

  // Separate regular contacts and the new contact row
  const regularContacts = filteredContacts.filter((c) => !c.isNew);
  const newContactRow = contacts.find(
    (c) =>
      c.isNew &&
      c.email === "" &&
      Object.values(c.customFields).every((v) => v === ""),
  ) || { id: "new-placeholder", email: "", customFields: {}, isNew: true };

  // Pagination math on regular contacts
  const totalItems = regularContacts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedContacts = regularContacts.slice(startIndex, endIndex);

  // Append the new row at the bottom if we're on the last page so adding contacts is seamless
  const displayContacts =
    safePage === totalPages
      ? [...paginatedContacts, newContactRow]
      : paginatedContacts;

  return (
    <TooltipProvider>
      <div className="skeu-page h-[100dvh] overflow-y-auto w-full flex flex-col">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4 w-full flex-1 flex flex-col">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/audience"
                    className="p-2 -ml-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-base transition-colors"
                  >
                    <ArrowLeft size={18} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Back to Mailing Lists
                </TooltipContent>
              </Tooltip>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold text-text-primary tracking-tight font-display">
                    {listName || "Mailing List"}
                  </h1>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-bg-subtle text-text-muted border border-border-subtle">
                    {validContactCount}{" "}
                    {validContactCount === 1 ? "contact" : "contacts"}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Manage spreadsheet contacts, custom attributes, and export
                  ready lists.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                onClick={() => batchSave(contacts)}
                disabled={!isDirty || saving}
                size="sm"
                className="flex items-center gap-2 skeu-btn-primary h-9 px-4 text-xs font-medium shadow-sm transition-all"
              >
                <Save size={14} />
                {saving ? "Saving..." : isDirty ? "Save Changes" : "Saved"}
              </Button>
            </div>
          </div>

          {/* YC Professional Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-bg-base p-2.5 rounded-lg border border-border-subtle shrink-0">
            {/* Left: Search + Faceted Filters */}
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[220px] max-w-sm flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                <Input
                  placeholder={
                    filterColumn === "all"
                      ? "Search all columns..."
                      : `Search ${filterColumn}...`
                  }
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Reset to page 1 on search
                  }}
                  className="h-8 pl-8 pr-8 text-xs bg-bg-base border-border-subtle focus-visible:ring-1 focus-visible:ring-primary-base w-full"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Unified Filters Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs bg-bg-base border-border-subtle relative"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-text-muted" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-base text-[9px] font-bold text-white">
                        {activeFiltersCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-72 p-0 bg-bg-base border-border-subtle shadow-2xl rounded-xl overflow-hidden"
                  align="start"
                >
                  <div className="bg-bg-base/50 px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-text-primary">
                      Filter Mailing List
                    </h4>
                    {activeFiltersCount > 0 && (
                      <span className="bg-primary-base/10 text-primary-base text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {activeFiltersCount} Active
                      </span>
                    )}
                  </div>

                  <div className="p-3 space-y-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-text-muted">
                        Search Column
                      </label>
                      <Select
                        value={filterColumn}
                        onValueChange={(val) => {
                          setFilterColumn(val);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs bg-bg-base border-border-subtle w-full mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Columns</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          {columns.map((col) => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-text-muted">
                        Row Status
                      </label>
                      <Select
                        value={filterStatus}
                        onValueChange={(val) => {
                          setFilterStatus(val);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1 bg-bg-base border-border-subtle w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="populated">
                            Complete rows
                          </SelectItem>
                          <SelectItem value="empty">Has empty cells</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-text-muted">
                        Delivery Status
                      </label>
                      <Select
                        value={filterSentStatus}
                        onValueChange={(val) => {
                          setFilterSentStatus(val);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="h-8 mt-1 text-xs bg-bg-base border-border-subtle w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Sent Status</SelectItem>
                          <SelectItem value="SENT">Sent</SelectItem>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="NOT_SENT">Not Sent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {activeFiltersCount > 0 && (
                    <div className="p-2 border-t border-border-subtle bg-bg-base/30">
                      <Button
                        variant="none"
                        className="w-full h-8 text-xs font-medium text-danger-text hover:bg-danger-bg/20 rounded-lg transition-colors"
                        onClick={() => {
                          setFilterColumn("all");
                          setFilterStatus("all");
                          setFilterSentStatus("all");
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {selectedIds.length > 0 && (
                <Button
                  onClick={() =>
                    setDeleteConfirmTarget({ type: "multi", ids: selectedIds })
                  }
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium bg-danger-bg/20 border-danger-border text-danger-text hover:bg-danger-bg/40"
                >
                  <Trash2 size={13} /> Delete ({selectedIds.length})
                </Button>
              )}
              <Button
                onClick={() => {
                  setExtractedWebRows([]);
                  setIsWebImportOpen(true);
                }}
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium bg-bg-base border-border-subtle hover:bg-bg-subtle text-text-primary"
              >
                <Globe
                  size={13}
                  className="text-primary-base dark:text-primary-base"
                />{" "}
                Import from Web
              </Button>
              <Button
                onClick={() => setIsColumnDialogOpen(true)}
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium bg-bg-base border-border-subtle hover:bg-bg-subtle"
              >
                <Plus size={13} /> Add Column
              </Button>
            </div>
          </div>

          {/* YC Table Grid Card */}
          <div className="border border-border-subtle rounded-lg bg-bg-base overflow-hidden shadow-sm flex flex-col flex-1">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-bg-base/80 border-b border-border-subtle sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[38px] border-r border-border-subtle text-center py-2.5 px-2">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-border-subtle text-primary-base focus:ring-1 cursor-pointer accent-primary-base"
                        checked={
                          paginatedContacts.length > 0 &&
                          paginatedContacts.every((c) =>
                            selectedIds.includes(c.id),
                          )
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            const pageIds = paginatedContacts.map((c) => c.id);
                            setSelectedIds(
                              Array.from(new Set([...selectedIds, ...pageIds])),
                            );
                          } else {
                            const pageIds = new Set(
                              paginatedContacts.map((c) => c.id),
                            );
                            setSelectedIds(
                              selectedIds.filter((id) => !pageIds.has(id)),
                            );
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-[48px] border-r border-border-subtle text-center font-mono text-xs text-text-muted font-medium py-2.5">
                      #
                    </TableHead>
                    <TableHead className="min-w-[240px] px-4 border-r border-border-subtle text-xs font-semibold text-text-primary py-2.5">
                      Email Address
                    </TableHead>
                    <TableHead className="min-w-[130px] border-r border-border-subtle text-xs font-semibold text-text-primary py-2.5 text-center">
                      Sent Status
                    </TableHead>
                    {columns.map((col) => (
                      <TableHead
                        key={col}
                        className="border-r border-border-subtle text-xs font-semibold text-text-primary py-2.5 min-w-[160px] group/col"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span>{col}</span>
                          <button
                            onClick={() => deleteColumn(col)}
                            className="opacity-0 group-hover/col:opacity-100 transition-opacity text-text-muted hover:text-danger-text p-0.5 rounded"
                            title={`Delete column "${col}"`}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="w-[60px] text-right py-2.5"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayContacts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length + 4}
                        className="text-center py-12 text-text-muted text-sm"
                      >
                        No contacts found matching your filter criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayContacts.map((contact, index) => {
                      const rowNumber = contact.isNew
                        ? "+"
                        : startIndex + index + 1;
                      return (
                        <TableRow
                          key={contact.id}
                          className={`hover:bg-bg-base/50 transition-colors group ${contact.isNew ? "bg-bg-base/30 font-medium" : ""}`}
                        >
                          {/* Checkbox Cell */}
                          <TableCell className="text-center border-r border-b border-border-subtle p-0 w-[38px] select-none bg-bg-base/40">
                            <div className="flex items-center justify-center h-9">
                              {!contact.isNew && (
                                <input
                                  type="checkbox"
                                  className="h-3.5 w-3.5 rounded border-border-subtle text-primary-base focus:ring-1 cursor-pointer accent-primary-base"
                                  checked={selectedIds.includes(contact.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedIds([
                                        ...selectedIds,
                                        contact.id,
                                      ]);
                                    } else {
                                      setSelectedIds(
                                        selectedIds.filter(
                                          (id) => id !== contact.id,
                                        ),
                                      );
                                    }
                                  }}
                                />
                              )}
                            </div>
                          </TableCell>

                          {/* Numbering Cell */}
                          <TableCell className="text-center border-r border-b border-border-subtle text-text-muted font-mono text-xs p-0 w-[48px] select-none bg-bg-base/40">
                            <div className="flex items-center justify-center h-9">
                              {rowNumber}
                            </div>
                          </TableCell>

                          {/* Email Cell */}
                          <TableCell className="p-0 border-r border-b border-border-subtle relative group">
                            <Input
                              className="h-9 w-full border-0 rounded-none bg-transparent focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary-base focus-visible:bg-bg-base transition-none text-xs px-3"
                              value={contact.email}
                              onChange={(e) =>
                                handleCellChange(
                                  contact.id,
                                  "email",
                                  e.target.value,
                                )
                              }
                              placeholder={
                                contact.isNew
                                  ? "+ Type email to add new contact..."
                                  : ""
                              }
                            />
                          </TableCell>

                          {/* Sent Status Cell */}
                          <TableCell className="text-center p-0 border-r border-b border-border-subtle w-[110px] select-none align-middle">
                            <div className="flex items-center justify-center h-9">
                              {!contact.isNew && contact.email && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => openHistory(contact.email)}
                                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                                        contact.sentStatus === "SENT"
                                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                          : contact.sentStatus === "PENDING"
                                            ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                                            : contact.sentStatus === "BOUNCED"
                                              ? "bg-danger-bg text-danger-text text-danger-text"
                                              : contact.sentStatus === "FAILED"
                                                ? "bg-danger-bg text-danger-text text-danger-text"
                                                : "bg-bg-subtle text-text-muted"
                                      }`}
                                    >
                                      {contact.sentStatus === "NOT_SENT"
                                        ? "Not Sent"
                                        : contact.sentStatus}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    View Campaign History
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>

                          {/* Custom Field Cells */}
                          {columns.map((col) => (
                            <TableCell
                              key={col}
                              className="p-0 border-r border-b border-border-subtle relative group"
                            >
                              <Input
                                className="h-9 w-full border-0 rounded-none bg-transparent focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary-base focus-visible:bg-bg-base transition-none text-xs px-3"
                                value={contact.customFields[col] || ""}
                                onChange={(e) =>
                                  handleCellChange(
                                    contact.id,
                                    col,
                                    e.target.value,
                                  )
                                }
                                placeholder={contact.isNew ? "" : ""}
                              />
                            </TableCell>
                          ))}

                          {/* Actions Cell */}
                          <TableCell className="text-center !px-2 border-b border-border-subtle p-0">
                            {(!contact.isNew || contact.email !== "") && (
                              <div className="flex justify-center items-center h-9 opacity-50 group-hover:opacity-100 transition-opacity">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="none"
                                      size="sm"
                                      className="h-6 text-center flex items-center justify-center w-6 p-0 text-text-muted :text-danger-text hover:bg-danger-bg/20 rounded cursor-pointer"
                                      onClick={() =>
                                        setDeleteConfirmTarget({
                                          type: "single",
                                          contact,
                                        })
                                      }
                                    >
                                      <Trash2 size={13} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Delete Contact
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* YC Table Pagination & Footer Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-bg-base/80 border-t border-border-subtle text-xs text-text-muted mt-auto">
              <div className="flex items-center gap-3">
                <span>
                  Showing{" "}
                  <strong className="text-text-primary font-medium">
                    {totalItems === 0 ? 0 : startIndex + 1}
                  </strong>{" "}
                  to{" "}
                  <strong className="text-text-primary font-medium">
                    {endIndex}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-text-primary font-medium">
                    {totalItems}
                  </strong>{" "}
                  entries
                </span>

                <div className="flex items-center gap-1.5 border-l border-border-subtle pl-3">
                  <span>Rows per page:</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(val) => {
                      setPageSize(Number(val));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-[64px] text-xs bg-bg-base border-border-subtle px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <span className="mr-2 font-medium text-text-primary">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 border-border-subtle bg-bg-base disabled:opacity-40"
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage <= 1}
                >
                  <ChevronsLeft size={13} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 border-border-subtle bg-bg-base disabled:opacity-40"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={safePage <= 1}
                >
                  <ChevronLeft size={13} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 border-border-subtle bg-bg-base disabled:opacity-40"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={safePage >= totalPages}
                >
                  <ChevronRight size={13} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 border-border-subtle bg-bg-base disabled:opacity-40"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage >= totalPages}
                >
                  <ChevronsRight size={13} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Add Column Dialog */}
        <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
          <DialogContent className="bg-bg-base text-text-primary border border-border-subtle shadow-2xl opacity-100">
            <DialogHeader>
              <DialogTitle>Add Column</DialogTitle>
              <DialogDescription>
                Enter a new column name (e.g., Company, Role).
              </DialogDescription>
            </DialogHeader>
            <div className="">
              <Input
                placeholder="Column Name"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addColumn();
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsColumnDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={addColumn}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import from Web Scraper Drawer */}
        <Drawer
          open={isWebImportOpen}
          onOpenChange={setIsWebImportOpen}
          direction="right"
        >
          <DrawerContent className="inset-y-0 right-0 h-full w-full sm:max-w-3xl rounded-none sm:rounded-l-2xl border-l border-border-subtle bg-bg-base text-text-primary shadow-2xl flex flex-col p-6 overflow-hidden">
            <DrawerHeader className="shrink-0 p-0 mb-4 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary-base dark:text-primary-base" />
                  <DrawerTitle className="text-lg">
                    Import Contacts from Web URLs
                  </DrawerTitle>
                </div>
                <button
                  onClick={() => setIsWebImportOpen(false)}
                  className="text-text-muted hover:text-text-primary p-1 rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <DrawerDescription className="mt-1">
                {extractedWebRows.length === 0
                  ? "Enter comma-separated website URLs (e.g., stripe.com, linear.app). Our scraper will visit each page, find career/contact emails, company names, and contact persons."
                  : `Extracted data from ${extractedWebRows.length} websites. Select which table column to map each field into:`}
              </DrawerDescription>
            </DrawerHeader>

            <div className="py-2 flex-1 overflow-y-auto space-y-5">
              {extractedWebRows.length === 0 ? (
                <div className="space-y-4">
                  <Textarea
                    placeholder="https://linear.app, https://stripe.com, vercel.com"
                    value={webUrlsInput}
                    onChange={(e) => setWebUrlsInput(e.target.value)}
                    className="h-48 font-mono text-xs border-border-subtle bg-bg-base text-text-primary focus-visible:ring-1 focus-visible:ring-primary-base"
                    disabled={extractingWeb}
                  />
                  {extractingWeb && (
                    <div className="flex items-center justify-center gap-3 p-6 rounded-lg bg-bg-base border border-border-subtle text-sm font-medium text-text-muted">
                      <Loader2 className="h-5 w-5 animate-spin text-primary-base" />
                      Visiting pages & extracting contact emails and company
                      data...
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Simple Column Mapping */}
                  <div className="border border-border-subtle rounded-lg p-3 bg-bg-base/50 space-y-3">
                    <div className="text-xs font-semibold text-text-primary px-1">
                      Map extracted data to columns:
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      <div className="flex items-center justify-between gap-3 bg-bg-base p-2.5 rounded border border-border-subtle">
                        <div className="text-xs font-medium text-text-primary">
                          Company Name{" "}
                          <span className="text-text-muted font-normal">
                            (e.g. Stripe, Linear)
                          </span>
                        </div>
                        <Select
                          value={companyColMapping}
                          onValueChange={setCompanyColMapping}
                        >
                          <SelectTrigger className="h-8 w-[220px] text-xs bg-bg-base border-border-subtle">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              -- Skip / Do not import --
                            </SelectItem>
                            <SelectItem
                              value="CREATE_COMPANY"
                              className="font-semibold text-primary-base dark:text-primary-base"
                            >
                              {`+ Add new col "Company"`}
                            </SelectItem>
                            {columns.map((col) => (
                              <SelectItem key={col} value={col}>
                                Select col: {col}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between gap-3 bg-bg-base p-2.5 rounded border border-border-subtle">
                        <div className="text-xs font-medium text-text-primary">
                          Person Name{" "}
                          <span className="text-text-muted font-normal">
                            (e.g. Karri Saarinen)
                          </span>
                        </div>
                        <Select
                          value={nameColMapping}
                          onValueChange={setNameColMapping}
                        >
                          <SelectTrigger className="h-8 w-[220px] text-xs bg-bg-base border-border-subtle">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              -- Skip / Do not import --
                            </SelectItem>
                            <SelectItem
                              value="CREATE_NAME"
                              className="font-semibold text-primary-base dark:text-primary-base"
                            >
                              {`+ Add new col "Person Name"`}
                            </SelectItem>
                            {columns.map((col) => (
                              <SelectItem key={col} value={col}>
                                Select col: {col}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between gap-3 bg-bg-base p-2.5 rounded border border-border-subtle">
                        <div className="text-xs font-medium text-text-primary">
                          Source Website{" "}
                          <span className="text-text-muted font-normal">
                            (e.g. https://linear.app)
                          </span>
                        </div>
                        <Select
                          value={urlColMapping}
                          onValueChange={setUrlColMapping}
                        >
                          <SelectTrigger className="h-8 w-[220px] text-xs bg-bg-base border-border-subtle">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              -- Skip / Do not import --
                            </SelectItem>
                            <SelectItem
                              value="CREATE_URL"
                              className="font-semibold text-primary-base dark:text-primary-base"
                            >
                              {`+ Add new col "Website"`}
                            </SelectItem>
                            {columns.map((col) => (
                              <SelectItem key={col} value={col}>
                                Select col: {col}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted px-1">
                      Previewing Extracted Contacts ({extractedWebRows.length})
                    </h4>
                    <div className="border border-border-subtle rounded-lg overflow-hidden max-h-72 overflow-y-auto bg-bg-base">
                      <Table>
                        <TableHeader className="bg-bg-base border-b border-border-subtle sticky top-0">
                          <TableRow>
                            <TableHead className="text-xs font-semibold py-2">
                              Email (Contact/Career)
                            </TableHead>
                            <TableHead className="text-xs font-semibold py-2">
                              {companyColMapping === "CREATE_COMPANY"
                                ? "Company (New Col)"
                                : companyColMapping !== "none"
                                  ? companyColMapping
                                  : "Company (Ignored)"}
                            </TableHead>
                            <TableHead className="text-xs font-semibold py-2">
                              {nameColMapping === "CREATE_NAME"
                                ? "Person Name (New Col)"
                                : nameColMapping !== "none"
                                  ? nameColMapping
                                  : "Name (Ignored)"}
                            </TableHead>
                            <TableHead className="text-xs font-semibold py-2">
                              Source Website
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {extractedWebRows.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs font-medium">
                                {row.email ? (
                                  <span className="text-primary-base dark:text-primary-base">
                                    {row.email}
                                  </span>
                                ) : (
                                  <span className="text-text-muted italic">
                                    No email found
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                {row.companyName || "-"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {row.personName || "-"}
                              </TableCell>
                              <TableCell className="text-xs text-text-muted truncate max-w-[150px]">
                                {row.url}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DrawerFooter className="shrink-0 border-t border-border-subtle pt-4 mt-auto p-0 flex flex-row justify-end gap-3">
              {extractedWebRows.length === 0 ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsWebImportOpen(false)}
                    disabled={extractingWeb}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleExtractFromWeb}
                    disabled={extractingWeb || !webUrlsInput.trim()}
                    className="gap-2"
                  >
                    {extractingWeb && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Start Extraction
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setExtractedWebRows([])}
                  >
                    Back / New URLs
                  </Button>
                  <Button
                    onClick={confirmAndImportWebData}
                    className="gap-2 skeu-btn-primary"
                  >
                    <Check className="h-4 w-4" /> Confirm & Import into Table
                  </Button>
                </>
              )}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* Delete Confirmation Dialog */}
        <ConfirmPopup
          isOpen={deleteConfirmTarget !== null}
          onClose={() => setDeleteConfirmTarget(null)}
          onConfirm={handleConfirmDelete}
          isLoading={deleting}
          title={
            deleteConfirmTarget?.type === "multi"
              ? "Delete Selected Contacts?"
              : "Delete Contact?"
          }
          description={
            deleteConfirmTarget?.type === "multi"
              ? `Are you sure you want to permanently delete ${deleteConfirmTarget.ids.length} selected contacts? This action cannot be undone.`
              : `Are you sure you want to permanently delete "${deleteConfirmTarget?.contact?.email || "this contact"}"? This action cannot be undone.`
          }
          confirmText="Delete"
          cancelText="Cancel"
          isDanger={true}
        />

        {/* Campaign History Drawer */}
        <Drawer
          open={isHistoryDrawerOpen}
          onOpenChange={setIsHistoryDrawerOpen}
          direction="right"
        >
          <DrawerContent className="inset-y-0 right-0 h-full w-full sm:max-w-md rounded-none sm:rounded-l-xl border-l border-border-subtle bg-bg-base p-6 shadow-2xl flex flex-col overflow-hidden">
            <DrawerHeader className="px-0 pt-0 pb-4 border-b border-border-subtle flex flex-col gap-1 text-left shrink-0">
              <DrawerTitle className="text-lg font-semibold text-text-primary">
                Campaign History
              </DrawerTitle>
              <DrawerDescription className="text-xs text-text-muted">
                History for{" "}
                <span className="font-mono text-primary-base dark:text-primary-base">
                  {selectedHistoryEmail}
                </span>
              </DrawerDescription>
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {loadingHistory ? (
                <div className="relative border-l border-border-subtle ml-2 pl-4 space-y-6 animate-pulse">
                  {[1, 2].map((i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-bg-base bg-border-subtle"></div>
                      <div className="bg-bg-base/50 border border-border-subtle rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <Skeleton className="h-5 w-16 rounded" />
                        </div>
                        <div className="pt-2 border-t border-border-subtle">
                          <Skeleton className="h-3 w-32 mb-2" />
                          <Skeleton className="h-16 w-full rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : historyData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-text-muted">
                  <p className="text-xs">
                    No campaign history found for this email.
                  </p>
                </div>
              ) : (
                <div className="relative border-l border-border-subtle ml-2 pl-4 space-y-6">
                  {historyData.map(
                    (rec: {
                      id: string;
                      status: string;
                      sentAt?: string;
                      createdAt: string;
                      campaign?: {
                        name: string;
                        template?: { subject: string; body: string };
                      };
                      dynamicData?: Record<string, unknown>;
                    }) => (
                      <div key={rec.id} className="relative">
                        <div
                          className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-bg-base ${rec.status === "SENT" ? "bg-green-500" : rec.status === "PENDING" ? "bg-yellow-500" : "bg-red-500"}`}
                        ></div>
                        <div className="bg-bg-base/50 border border-border-subtle rounded-lg p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-semibold text-text-primary">
                                {rec.campaign?.name || "Unknown Campaign"}
                              </h4>
                              <p className="text-xs text-text-muted">
                                {rec.status === "SENT"
                                  ? `Sent on ${new Date(rec.sentAt || rec.createdAt).toLocaleString()}`
                                  : `Status: ${rec.status}`}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                                rec.status === "SENT"
                                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                  : rec.status === "PENDING"
                                    ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                                    : "bg-danger-bg text-danger-text text-danger-text"
                              }`}
                            >
                              {rec.status}
                            </span>
                          </div>
                          {rec.campaign?.template && (
                            <div className="pt-2 border-t border-border-subtle space-y-2">
                              <div>
                                <p className="text-xs text-text-muted font-medium mb-1">
                                  Subject:
                                </p>
                                <p className="text-xs text-text-primary bg-bg-base p-2 rounded border border-border-subtle">
                                  {rec.campaign.template.subject}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-text-muted font-medium mb-1">
                                  Body Template:
                                </p>
                                <div className="text-xs text-text-primary bg-bg-base p-2 rounded border border-border-subtle max-h-32 overflow-y-auto whitespace-pre-wrap">
                                  {rec.campaign.template.body}
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="pt-2 border-t border-border-subtle">
                            <p className="text-xs text-text-muted font-medium mb-1">
                              Context variables used:
                            </p>
                            <pre className="text-[10px] font-mono bg-bg-base p-2 rounded border border-border-subtle text-text-primary overflow-x-auto">
                              {JSON.stringify(rec.dynamicData || {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>

            <DrawerFooter className="px-0 pb-0 pt-4 border-t border-border-subtle shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="w-full"
              >
                Close
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </TooltipProvider>
  );
}
