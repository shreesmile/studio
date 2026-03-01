
"use client";

import React, { useState, useEffect } from "react";
import { 
  SidebarProvider, 
  SidebarInset, 
  SidebarTrigger 
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { UserManagement } from "@/components/dashboard/UserManagement";
import { TaskManagement } from "@/components/dashboard/TaskManagement";
import { useAuth, UserRole } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, Lock, LayoutDashboard } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const { user, login, isLoaded } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Reset active tab if it's not allowed for the current role
  useEffect(() => {
    if (user) {
      if (activeTab === 'users' && !['Super Admin', 'Admin'].includes(user.role)) {
        setActiveTab('dashboard');
      }
    }
  }, [user, activeTab]);

  if (!isLoaded) return <div className="flex items-center justify-center h-screen bg-background">Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 bg-[#ECF1F4]">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-6">
              <ShieldCheck className="text-white w-10 h-10" />
            </div>
            <h1 className="text-4xl font-headline font-extrabold text-primary tracking-tight">RoleFlow</h1>
            <p className="mt-2 text-muted-foreground font-body">Professional RBAC Management Platform</p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-xl border border-white space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Sign In</h2>
              <p className="text-sm text-muted-foreground">Select a mock role to explore the system permissions</p>
            </div>

            <div className="grid gap-3">
              {(['Super Admin', 'Admin', 'Manager', 'Team Lead', 'Employee'] as UserRole[]).map((role) => (
                <Button 
                  key={role}
                  variant="outline" 
                  onClick={() => login(role)}
                  className="w-full justify-between h-12 group hover:border-accent hover:bg-accent/5"
                >
                  <span className="font-medium">{role}</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              ))}
            </div>

            <Separator />
            
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" />
              Secure Enterprise Authentication
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <OverviewTab />;
      case "users":
        return <UserManagement />;
      case "tasks":
        return <TaskManagement />;
      case "analytics":
        return (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border border-dashed text-muted-foreground">
            <LayoutDashboard className="h-12 w-12 mb-4 opacity-20" />
            <p>Analytical module data is loading...</p>
          </div>
        );
      default:
        return <OverviewTab />;
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case "dashboard": return "Performance Overview";
      case "users": return "User Directory";
      case "tasks": return "Task Board";
      case "analytics": return "Strategic Analytics";
      default: return "RoleFlow Dashboard";
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <SidebarInset className="bg-[#ECF1F4]">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background/80 backdrop-blur-md px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="h-4" />
              <h1 className="text-sm font-semibold tracking-tight text-[#457399]">
                {getPageTitle()}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] font-medium text-muted-foreground">Connected as</span>
                <span className="ml-1 text-[10px] font-bold text-accent">{user.role}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
            {renderContent()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
