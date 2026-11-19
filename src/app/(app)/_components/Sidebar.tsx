"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import {
  LogOut,
  LayoutDashboard,
  Mail,
  FileText,
  Inbox,
  BarChart2,
  Settings,
  Server,
  ChevronRight,
  Users,
  Compass,
  ChevronLeft,
  UserCog,
  Briefcase,
  Crosshair,
  CheckCheck,
  Bot,
} from "lucide-react";
import { createClientBrowser } from "@/lib/supabase-client";
import { useInboxStore } from "@/stores/useInboxStore";
import { useLayoutStore } from "@/stores/useLayoutStore";
import { Logo } from "@/components/ui/Logo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Mail },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/audience", label: "Mailing Lists", icon: Users },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/accounts", label: "Accounts", icon: Server },
  { href: "/analytics", label: "Analytics", icon: BarChart2, disabled: false },
  { href: "/sourcing", label: "Sourcing", icon: Crosshair },
  { href: "/outreach", label: "Approvals", icon: CheckCheck },
  { href: "/pipeline", label: "Pipeline", icon: Briefcase },
  { href: "/agent", label: "Agent", icon: Bot },
  { href: "/setup", label: "Profile Setup", icon: UserCog },
  { href: "/settings", label: "Settings", icon: Settings },
];

import { DashboardTour } from "./DashboardTour";
import { User } from "@supabase/supabase-js";

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientBrowser();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isMobileSidebarOpen, setMobileSidebar } = useLayoutStore();
  const [tourForceOpen, setTourForceOpen] = useState(false);

  const { unreadCount, fetchReplies } = useInboxStore();

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      <DashboardTour
        forceOpen={tourForceOpen}
        onCloseForce={() => setTourForceOpen(false)}
      />
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-primary-base/20 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileSidebar(false)}
        />
      )}

      <div
        className={`${
          isCollapsed ? "w-20" : "w-64"
        } skeu-sidebar h-dvh transition-all duration-300 shrink-0 
        fixed md:relative inset-y-0 left-0 z-50 md:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Button
          variant="none"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-5 bg-bg-base border border-border-subtle rounded-full p-1 -skeu-raised hover:bg-bg-base text-text-muted transition-colors z-100 cursor-pointer"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>

        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
          <div
            className={`h-16 flex items-center border-b border-border-subtle ${isCollapsed ? "justify-center px-0" : "px-6"}`}
          >
            <Logo
              href="/"
              showText={!isCollapsed}
              iconSize={24}
              textSize="text-xl"
              textColor="text-text-primary"
            />
          </div>

          <nav className={`flex-1 p-4 space-y-1 ${isCollapsed ? "px-2" : ""}`}>
            {navItems.map((item) => {
              const active =
                pathname.startsWith(item.href) &&
                (item.href !== "/dashboard" || pathname === "/dashboard");
              const Icon = item.icon;

              const content = (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={isCollapsed ? 20 : 18} className="shrink-0 " />
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>
                  {!isCollapsed && item.disabled && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-text-muted bg-bg-subtle px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                      Soon
                    </span>
                  )}
                  {!isCollapsed &&
                    item.href === "/inbox" &&
                    unreadCount > 0 &&
                    !item.disabled && (
                      <span className="bg-primary-base text-primary-text text-[11px] font-bold px-2 py-0.8 rounded-full shadow-xs tracking-tight">
                        {unreadCount}
                      </span>
                    )}
                 
                </>
              );

              if (item.disabled) {
                return (
                  <div
                    key={item.href}
                    className={`skeu-nav-item flex items-center justify-between opacity-50 cursor-not-allowed ${isCollapsed ? "justify-center px-0 py-3" : ""}`}
                    title={
                      isCollapsed ? `${item.label} (Coming Soon)` : undefined
                    }
                  >
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`skeu-nav-item flex items-center justify-between ${active ? "active" : ""} ${isCollapsed ? "justify-center px-0 py-3" : ""}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  {content}
                </Link>
              );
            })}
          </nav>

          <div
            className={`p-4 border-t border-border-subtle flex flex-col gap-3 ${isCollapsed ? "items-center px-2" : ""}`}
          >
            {/* Tour Button */}
            {!isCollapsed ? (
              <button
                onClick={() => setTourForceOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-border-subtle bg-bg-subtle/50 text-xs text-text-primary font-medium hover:bg-bg-subtle transition-colors shadow-sm"
              >
                <Compass size={14} className="text-primary-base" />
                Take a tour
              </button>
            ) : (
              <button
                onClick={() => setTourForceOpen(true)}
                className="w-10 h-10 flex flex-col items-center justify-center rounded-lg hover:bg-bg-subtle transition-colors text-text-muted hover:text-primary-base"
                title="Take a tour"
              >
                <Compass size={18} />
              </button>
            )}

            {/* Profile & Logout Box */}
            <div
              className={`flex ${
                isCollapsed
                  ? "flex-col items-center gap-2"
                  : "items-center justify-between pl-1 pr-1 py-1"
              } rounded-xl ${!isCollapsed ? "border border-border-subtle bg-bg-base shadow-sm -skeu-inset" : ""}`}
            >
              <div
                className={`flex items-center gap-2 ${isCollapsed ? "justify-center" : ""} cursor-pointer flex-1 min-w-0`}
                onClick={() => router.push("/settings")}
                title="Settings"
              >
                <div className="w-8 h-8 rounded-full bg-border-subtle flex items-center justify-center text-primary-base font-bold shadow-inner shrink-0 overflow-hidden">
                  <Image
                    src={`https://api.dicebear.com/10.x/notionists/svg?seed=${encodeURIComponent(
                      user.user_metadata?.full_name || user.email || "Aneka"
                    )}`}
                    alt="Avatar"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="text-[13px] text-text-primary truncate font-semibold leading-tight">
                      {user.user_metadata?.full_name?.split(" ")[0] || "User"}
                    </div>
                    <div className="text-[10px] text-text-muted truncate leading-tight">
                      {user.email}
                    </div>
                  </div>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleSignOut}
                className={`flex items-center justify-center p-2 text-text-muted hover:text-danger-text hover:bg-danger-bg/20 transition-colors cursor-pointer rounded-lg shrink-0 ${isCollapsed ? "w-10 h-10 border border-border-subtle bg-bg-base" : ""}`}
                title="Sign Out"
              >
                <LogOut size={isCollapsed ? 18 : 14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
