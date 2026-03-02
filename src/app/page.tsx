
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { useAuthStore } from "@/lib/auth-store";
import { ShieldCheck, Lock, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useUser, useFirestore, FirebaseClientProvider } from "@/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { LoginForm } from "@/components/auth/LoginForm";

// Standard imports instead of lazy loading to prevent chunk loading errors
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { ProjectManagement } from "@/components/dashboard/ProjectManagement";
import { TaskManagement } from "@/components/dashboard/TaskManagement";
import { WorkLogTerminal } from "@/components/dashboard/WorkLogTerminal";
import { UserManagement } from "@/components/dashboard/UserManagement";
import { ReportsTab } from "@/components/dashboard/ReportsTab";
import { AttendanceTab } from "@/components/dashboard/AttendanceTab";
import { LeaveManagement } from "@/components/dashboard/LeaveManagement";

function DashboardContent() {
  const { user: authUser, isUserLoading } = useUser();
  const { profile, setProfile, logout: clearProfile } = useAuthStore();
  const db = useFirestore();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isInitializing, setIsInitializing] = useState(true);
  const syncRef = useRef<string | null>(null);

  useEffect(() => {
    if (isUserLoading) return;

    if (!authUser) {
      clearProfile();
      syncRef.current = null;
      setIsInitializing(false);
      return;
    }

    // Only subscribe if the user ID has changed or profile is missing/stale
    if (authUser && (syncRef.current !== authUser.uid || !profile || profile.id !== authUser.uid)) {
      syncRef.current = authUser.uid;
      setIsInitializing(true);
      
      const unsub = onSnapshot(doc(db, "users", authUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(data as any);
        }
        setIsInitializing(false);
      }, (err) => {
        console.error("Profile synchronization failure:", err);
        setIsInitializing(false);
      });
      return () => unsub();
    } else if (authUser && profile && profile.id === authUser.uid) {
      setIsInitializing(false);
    }
  }, [authUser, isUserLoading, db, setProfile, clearProfile, profile]);

  const handleTabChange = useCallback((id: string) => {
    setActiveTab(id);
  }, []);

  if (isUserLoading || (authUser && (isInitializing || !profile || profile.id !== authUser.uid))) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#ECF1F4] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Verifying Clearance...</p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-[#ECF1F4] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-2xl mb-6 ring-4 ring-white">
              <ShieldCheck className="text-white w-10 h-10" />
            </div>
            <h1 className="text-4xl font-black text-primary tracking-tighter uppercase italic text-center">RoleFlow</h1>
            <p className="mt-2 text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Strategic Access Terminal</p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-white space-y-6">
            <LoginForm />
            <Separator />
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              <Lock className="w-3 h-3" />
              Secure MNC Access Layer
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <OverviewTab />;
      case "projects": return <ProjectManagement />;
      case "tasks": return <TaskManagement />;
      case "timelogs": return <WorkLogTerminal />;
      case "users": return <UserManagement />;
      case "reports": return <ReportsTab />;
      case "attendance": return <AttendanceTab />;
      case "leave": return <LeaveManagement />;
      default: return <OverviewTab />;
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case "dashboard": return "Operational Overview";
      case "projects": return "Project Portfolio";
      case "tasks": return "Workflow Engine";
      case "timelogs": return "Work Log Terminal";
      case "users": return "Strategic Directory";
      case "reports": return "Analytics Center";
      case "attendance": return "Shift Terminal";
      case "leave": return "Absence Manager";
      default: return "Enterprise Dashboard";
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#ECF1F4]">
        <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        <SidebarInset className="bg-transparent">
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background/80 backdrop-blur-md px-6 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="h-4" />
              <h1 className="text-[11px] font-black tracking-[0.2em] text-[#457399] uppercase">
                {getPageTitle()}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[9px] font-bold text-muted-foreground uppercase leading-none">Security Level</p>
                <p className="text-[11px] font-black text-accent uppercase">{profile?.role || "Synchronizing..."}</p>
              </div>
            </div>
          </header>
          <main className="flex-1 p-8 max-w-7xl mx-auto w-full animate-fade-in">
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
