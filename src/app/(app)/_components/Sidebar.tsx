"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import {
  Snowflake,
  LogOut,
  LayoutDashboard,
  Mail,
  FileText,
  Inbox,
  BarChart2,
  Settings,
  Server,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { createClientBrowser } from "@/lib/supabase-client";
import { useInboxStore } from "@/stores/useInboxStore";
import { Logo } from "@/components/ui/Logo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Mail },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/accounts", label: "Accounts", icon: Server },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

import { User } from "@supabase/supabase-js";

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientBrowser();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { unreadCount, fetchReplies } = useInboxStore();

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div
      className={`${isCollapsed ? "w-20" : "w-64"} skeu-sidebar h-[100dvh] transition-all duration-300 relative shrink-0`}
    >
      <Button
        variant="none"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-5 bg-surface-100 border border-surface-400 rounded-full p-1  -skeu-raised hover:bg-surface-50 text-surface-600 transition-colors z-[100] cursor-pointer"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </Button>

      <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
        <div
          className={`h-16 flex items-center border-b border-surface-400 ${isCollapsed ? "justify-center px-0" : "px-6"}`}
        >
          <Logo
            showText={!isCollapsed}
            iconSize={24}
            textSize="text-xl"
            textColor="text-surface-900"
          />
        </div>

        <nav className={`flex-1 p-4 space-y-1 ${isCollapsed ? "px-2" : ""}`}>
          {navItems.map((item) => {
            const active =
              pathname.startsWith(item.href) &&
              (item.href !== "/dashboard" || pathname === "/dashboard");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`skeu-nav-item flex items-center justify-between ${active ? "active" : ""} ${isCollapsed ? "justify-center px-0 py-3" : ""}`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-2">
                  <Icon size={isCollapsed ? 20 : 18} className="shrink-0 " />
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </div>
                {!isCollapsed && item.href === "/inbox" && unreadCount > 0 && (
                  <span className="bg-ice-500 text-white text-xs font-bold px-2 py-0.5 rounded-full  -sm">
                    {unreadCount}
                  </span>
                )}
                {isCollapsed && item.href === "/inbox" && unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-ice-500 rounded-full"></span>
                )}
              </Link>
            );
          })}
        </nav>

        <div
          className={`p-4 border-t border-surface-400 flex flex-col gap-3 ${isCollapsed ? "items-center px-2" : ""}`}
        >
          <div
            className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : "px-2"} cursor-pointer`}
            onClick={() => {
              router.push("/settings");
            }}
          >
            <div className="w-8 h-8 rounded-full bg-ice-100 flex items-center justify-center text-ice-700 font-bold  -skeu-inset shrink-0">
              {(user.email || "U").charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="text-sm text-surface-900 truncate font-medium">
                {user.user_metadata?.full_name || user.email}
              </div>
            )}
          </div>

          <div className={`flex ${isCollapsed ? "flex-col" : ""} gap-2 w-full`}>
            <Button
              variant="none"
              onClick={handleSignOut}
              className={`flex items-center justify-center gap-2 p-1.5 text-sm text-text-muted hover:text-danger-text hover:bg-danger-bg/20 transition-colors cursor-pointer rounded-lg ${!isCollapsed && "flex-1 border border-border-subtle"}`}
              title="Sign Out"
            >
              <LogOut size={16} />
              {!isCollapsed && <span>Sign Out</span>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
