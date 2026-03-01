
"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Briefcase,
  ShieldCheck,
  LogOut,
  ChevronRight,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuthStore, UserRole } from "@/lib/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";

interface NavItem {
  id: string;
  title: string;
  icon: React.ElementType;
  minWeight: number;
}

const navItems: NavItem[] = [
  { id: "dashboard", title: "Overview", icon: LayoutDashboard, minWeight: 1 },
  { id: "attendance", title: "Attendance", icon: Clock, minWeight: 1 },
  { id: "leave", title: "Leave Requests", icon: CalendarDays, minWeight: 1 },
  { id: "users", title: "User Directory", icon: Users, minWeight: 2 },
  { id: "tasks", title: "Tasks", icon: Briefcase, minWeight: 1 },
];

const ROLE_WEIGHTS: Record<UserRole, number> = {
  'Super Admin': 5,
  'Admin': 4,
  'Manager': 3,
  'Team Lead': 2,
  'Employee': 1
};

export function AppSidebar({ activeTab, onTabChange }: { activeTab: string, onTabChange: (id: string) => void }) {
  const { profile, logout: clearStore } = useAuthStore();
  const auth = useAuth();
  const { state } = useSidebar();

  const handleLogout = async () => {
    await signOut(auth);
    await fetch('/api/auth/session', { method: 'POST', body: JSON.stringify({ idToken: null }) });
    clearStore();
    window.location.href = '/';
  };

  const userWeight = profile ? ROLE_WEIGHTS[profile.role] : 0;
  const filteredNavItems = navItems.filter(item => userWeight >= item.minWeight);

  return (
    <Sidebar collapsible="icon" className="border-r bg-white">
      <SidebarHeader className="h-16 flex items-center px-4 border-b">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          {state !== "collapsed" && (
            <span className="font-bold text-lg text-primary tracking-tight truncate">
              RoleFlow
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="p-3">
        <SidebarMenu>
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={activeTab === item.id}
                onClick={() => onTabChange(item.id)}
                tooltip={item.title}
                className={`transition-all duration-200 h-10 px-3 rounded-lg flex items-center justify-between ${
                  activeTab === item.id 
                    ? "bg-primary/10 text-primary font-bold shadow-sm" 
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${activeTab === item.id ? "text-primary" : ""}`} />
                  <span>{item.title}</span>
                </div>
                {activeTab === item.id && state !== "collapsed" && (
                  <ChevronRight className="w-3 h-3 text-primary animate-in fade-in slide-in-from-left-2" />
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t bg-muted/20">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border-2 border-white shadow-sm ring-1 ring-muted">
              <AvatarImage src={`https://picsum.photos/seed/${profile?.id}/100/100`} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {profile?.name.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            {state !== "collapsed" && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold truncate text-foreground">{profile?.name}</span>
                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">{profile?.role}</span>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 text-destructive font-bold text-[10px] hover:opacity-80 transition-all w-full px-2 py-2 rounded-md hover:bg-destructive/5"
          >
            <LogOut className="w-3.5 h-3.5" />
            {state !== "collapsed" && <span className="uppercase tracking-widest">Logout Session</span>}
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
