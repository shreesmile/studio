
"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronRight,
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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, UserRole } from "@/lib/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    roles: ["Super Admin", "Admin"],
  },
  {
    id: "tasks",
    title: "Task Management",
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
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    roles: ["Super Admin"],
  },
];

export function AppSidebar({ activeTab, onTabChange }: { activeTab: string, onTabChange: (id: string) => void }) {
  const { user, logout } = useAuth();
  const { state } = useSidebar();

  const filteredNavItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <Sidebar collapsible="icon" className="border-r">
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
      <SidebarContent className="p-2">
        <SidebarMenu>
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={activeTab === item.id}
                onClick={() => onTabChange(item.id)}
                tooltip={item.title}
                className="transition-all duration-200"
              >
                <item.icon className="w-5 h-5" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={`https://picsum.photos/seed/${user?.id}/100/100`} />
              <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {state !== "collapsed" && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">{user?.name}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.role}</span>
              </div>
            )}
          </div>
          <SidebarMenuButton onClick={logout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
