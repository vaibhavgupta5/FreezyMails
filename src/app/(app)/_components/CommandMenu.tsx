"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Send, Users, Home, PlusCircle } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <div className="hidden md:flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-between whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-subtle disabled:pointer-events-none disabled:opacity-50 border border-border-subtle bg-bg-base shadow-sm hover:bg-bg-subtle hover:text-text-primary h-9 px-4 py-2 w-48 lg:w-64 text-sm text-text-muted"
        >
          <span className="flex items-center">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            Search...
          </span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border-subtle bg-bg-subtle px-1.5 font-mono text-[10px] font-medium text-text-muted opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup  heading="Create New">
              <CommandItem
                onSelect={() => runCommand(() => router.push("/campaigns/new"))}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                <span>New Campaign</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/templates/new"))}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                <span>New Template</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/audience/new"))}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                <span>New Mailing List</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Navigation">
              <CommandItem
                onSelect={() => runCommand(() => router.push("/dashboard"))}
              >
                <Home className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/campaigns"))}
              >
                <Send className="mr-2 h-4 w-4" />
                <span>Campaigns</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/templates"))}
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>Templates</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/contacts"))}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>Contacts</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
