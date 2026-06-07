"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
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
  Sun,
  Moon,
} from "lucide-react";
import { createClientBrowser } from "@/lib/supabase-client";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Mail },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/accounts", label: "Accounts", icon: Server },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientBrowser();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className={`${isCollapsed ? "w-20" : "w-64"} skeu-sidebar flex flex-col min-h-screen transition-all duration-300 relative`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-5 bg-surface-100 border border-surface-400 rounded-full p-1 shadow-skeu-raised hover:bg-surface-50 text-surface-600 transition-colors z-50"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className={`h-16 flex items-center border-b border-surface-400 gap-2 ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
        <Snowflake className="text-ice-500 shrink-0" size={24} />
        {!isCollapsed && <h1 className="text-xl font-medium text-surface-900 truncate">FreezyMails</h1>}
      </div>

      <nav className={`flex-1 p-4 space-y-1 overflow-hidden ${isCollapsed ? 'px-2' : ''}`}>
        {navItems.map((item) => {
          const active =
            pathname.startsWith(item.href) &&
            (item.href !== "/dashboard" || pathname === "/dashboard");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`skeu-nav-item ${active ? "active" : ""} ${isCollapsed ? "justify-center px-0 py-3" : ""}`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={isCollapsed ? 20 : 18} className="shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={`p-4 border-t border-surface-400 flex flex-col gap-3 ${isCollapsed ? 'items-center px-2' : ''}`}>
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'px-2'}`}>
          <div className="w-8 h-8 rounded-full bg-ice-100 flex items-center justify-center text-ice-700 font-bold shadow-skeu-inset shrink-0">
            {user.email.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="text-sm text-surface-900 truncate font-medium">
              {user.user_metadata?.full_name || user.email}
            </div>
          )}
        </div>
        
        <div className={`flex ${isCollapsed ? 'flex-col' : ''} gap-2 w-full`}>
          <button
            onClick={handleSignOut}
            className={`flex items-center justify-center gap-2 p-1.5 text-sm text-surface-600 hover:text-red-600 transition-colors rounded-lg hover:bg-surface-100 ${!isCollapsed && 'flex-1 border border-surface-300'}`}
            title="Sign Out"
          >
            <LogOut size={16} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
