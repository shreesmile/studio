
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
import { useAuthStore, UserRole } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, Lock, LayoutDashboard, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useUser, useFirestore, useDoc, FirebaseClientProvider } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { LoginForm } from "@/components/auth/LoginForm";

function DashboardContent() {
  const { user, isUserLoading } = useUser();
  const { profile, setProfile, logout: clearStore } = useAuthStore();
  const db = useFirestore();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Sync Firebase User with Firestore Profile
  useEffect(() => {
    if (user && !profile) {
      const fetchProfile = async () => {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as any);
        }
      };
      fetchProfile();
    } else if (!user && profile) {
      clearStore();
    }
  }, [user, profile, db, setProfile, clearStore]);

  // Tab permission check
  useEffect(() => {
    if (profile) {
      const adminRoles: UserRole[] = ['Super Admin', 'Admin'];
      if (activeTab === 'users' && !adminRoles.includes(profile.role)) {
        setActiveTab('dashboard');
      }
    }
  }, [profile, activeTab]);

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Authenticating with RoleFlow...</p>
      </div>
    );
  }

  if (!user || !profile) {
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
            <LoginForm />
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
                <span className="ml-1 text-[10px] font-bold text-accent uppercase">{profile.role}</span>
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

export default function Home() {
  return (
    <FirebaseClientProvider>
      <DashboardContent />
    </FirebaseClientProvider>
  );
}
