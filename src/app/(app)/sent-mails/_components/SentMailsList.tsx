"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Search, Calendar as CalendarIcon, X, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import SentMailDrawer from "./SentMailDrawer";

export type SentMailData = {
  id: string;
  recipientId: string;
  accountId: string | null;
  email: string;
  campaignId: string;
  campaignName: string;
  sentAt: string;
  subject: string;
  body: string;
};

type SentMailsListProps = {
  initialData: SentMailData[];
  totalItems: number;
  accounts: { id: string; label: string; fromEmail: string }[];
  templates: { id: string; name: string; subject: string; body: string }[];
  currentPage: number;
  totalPages: number;
  currentDate?: string;
};

export default function SentMailsList({
  initialData,
  totalItems,
  accounts,
  templates,
  currentPage,
  totalPages,
  currentDate,
}: SentMailsListProps) {
  const mails = initialData; // Always strictly driven by server data
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMail, setSelectedMail] = useState<SentMailData | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  // Client-side text filter on the current page's batch
  const filteredMails = mails.filter(
    (m) =>
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.campaignName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      router.refresh();
    }, 60000); // 1 minute

    return () => clearInterval(intervalId);
  }, [router]);

  const handleDateChange = (date: Date | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (date) {
      params.set("date", format(date, "yyyy-MM-dd"));
      params.set("page", "1");
    } else {
      params.delete("date");
      params.set("page", "1");
    }
    router.push(`?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative w-full lg:w-72">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <Input
            placeholder="Search email, subject, or campaign..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="skeu-input pl-9 w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={`skeu-btn ${currentDate ? "bg-bg-subtle text-text-primary" : "text-text-muted"} border-border-subtle`}>
              <CalendarIcon size={16} className="mr-2" />
              {currentDate ? format(new Date(currentDate), "PPP") : "Filter by date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={currentDate ? new Date(currentDate) : undefined}
              onSelect={handleDateChange}
            />
            {currentDate && (
              <div className="p-2 border-t border-border-subtle">
                <Button variant="ghost" size="sm" className="w-full text-xs h-8 text-text-muted" onClick={() => handleDateChange(undefined)}>
                  Clear filter
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        
          <Button variant="outline" className="skeu-btn border-border-subtle text-text-muted" onClick={() => router.refresh()}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </div>

        <div className="lg:ml-auto text-sm text-text-muted">
          Showing {mails.length} of {totalItems} mails
        </div>
      </div>

      {/* Table */}
      <div className="skeu-card -skeu-base overflow-hidden flex-1 flex flex-col min-h-0 mt-2 lg:mt-0">
        <div className="overflow-y-auto overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[750px]">
            <thead className="bg-bg-subtle text-text-muted sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-medium border-b border-border-subtle w-1/4">
                  Recipient
                </th>
                <th className="px-4 py-3 font-medium border-b border-border-subtle w-1/3">
                  Subject
                </th>
                <th className="px-4 py-3 font-medium border-b border-border-subtle">
                  Campaign
                </th>
                <th className="px-4 py-3 font-medium border-b border-border-subtle">
                  Date Sent
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredMails.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-text-muted"
                  >
                    No sent mails found.
                  </td>
                </tr>
              ) : (
                filteredMails.map((mail) => (
                  <tr
                    key={mail.id}
                    onClick={() => setSelectedMail(mail)}
                    className="hover:bg-bg-subtle transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {mail.email}
                    </td>
                    <td className="px-4 py-3 text-text-primary truncate max-w-[200px]" title={mail.subject}>
                      {mail.subject}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {mail.campaignName}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {format(new Date(mail.sentAt), "MMM d, yyyy HH:mm")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pt-2 pb-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                />
              </PaginationItem>
              
              <PaginationItem>
                <div className="text-sm font-medium px-4 text-text-primary">
                  Page {currentPage} of {totalPages}
                </div>
              </PaginationItem>

              <PaginationItem>
                <PaginationNext 
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
      
      {/* Selected Mail Drawer */}
      <SentMailDrawer 
        mail={selectedMail} 
        onClose={() => setSelectedMail(null)} 
        accounts={accounts}
        templates={templates}
      />
    </div>
  );
}
