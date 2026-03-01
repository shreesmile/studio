"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  BarChart3,
  ShieldCheck,
  LogOut,
  Briefcase
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
import { SheetTitle } from "@/components/ui/sheet";

interface NavItem {
  title: string;
  icon: React.ElementType;
  roles: UserRole[];
  id: string;
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    roles: ["Super Admin", "Admin", "Manager", "Team Lead", "Employee"],
  },
  {
    id: "users",
    title: "User Management",
    icon: Users,
    roles: ["Super Admin", "Admin", "Manager", "Team Lead"],
  },
  {
    id: "tasks",
    title: "Task Board",
    icon: CheckSquare,
    roles: ["Super Admin", "Admin", "Manager", "Team Lead", "Employee"],
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: BarChart3,
    roles: ["Super Admin", "Admin", "Manager"],
  },
  {
    id: "departments",
    title: "Departments",
    icon: Briefcase,
    roles: ["Super Admin"],
  },
];

export function AppSidebar({ activeTab, onTabChange }: { activeTab: string, onTabChange: (id: string) => void }) {
  const { profile, logout: clearStore } = useAuthStore();
  const auth = useAuth();
  const { state } = useSidebar();

  const handleLogout = async () => {
    await signOut(auth);
    await fetch('/api/auth/session', { method: 'POST', body: JSON.stringify({ idToken: null }) });
    clearStore();
  };

  const filteredNavItems = navItems.filter((item) =>
    profile ? item.roles.includes(profile.role) : false
  );

  return (
    <Sidebar collapsible="icon" className="border-r bg-white">
      <SidebarHeader className="h-16 flex items-center px-4 border-b">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          {state !== "collapsed" && (
            <span className="font-headline font-bold text-xl text-primary tracking-tight truncate">
              RoleFlow
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="p-4">
        <SidebarMenu>
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={activeTab === item.id}
                onClick={() => onTabChange(item.id)}
                tooltip={item.title}
                className={`transition-all duration-200 h-10 px-3 rounded-lg ${
                  activeTab === item.id 
                    ? "bg-primary/5 text-primary font-semibold" 
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? "text-primary" : ""}`} />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-muted shadow-sm">
              <AvatarImage src={`https://picsum.photos/seed/${profile?.id}/100/100`} />
              <AvatarFallback>{profile?.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {state !== "collapsed" && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold truncate text-foreground">{profile?.name}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{profile?.role}</span>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 text-destructive font-medium text-xs hover:opacity-80 transition-opacity w-full px-1"
          >
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            {state !== "collapsed" && <span>Logout</span>}
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}