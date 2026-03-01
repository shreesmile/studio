
"use client";

import React, { useState, useEffect, useRef, Suspense, lazy, useCallback } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { useAuthStore } from "@/lib/auth-store";
import { ShieldCheck, Lock, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useUser, useFirestore, FirebaseClientProvider } from "@/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { LoginForm } from "@/components/auth/LoginForm";

// Lazy load dashboard components for performance
const OverviewTab = lazy(() => import("@/components/dashboard/OverviewTab").then(m => ({ default: m.OverviewTab })));
const UserManagement = lazy(() => import("@/components/dashboard/UserManagement").then(m => ({ default: m.UserManagement })));
const AttendanceTab = lazy(() => import("@/components/dashboard/AttendanceTab").then(m => ({ default: m.AttendanceTab })));
const LeaveManagement = lazy(() => import("@/components/dashboard/LeaveManagement").then(m => ({ default: m.LeaveManagement })));
const TaskManagement = lazy(() => import("@/components/dashboard/TaskManagement").then(m => ({ default: m.TaskManagement })));

function TabLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-50">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Initializing Module...</p>
    </div>
  );
}

function DashboardContent() {
  const { user, isUserLoading } = useUser();
  const { profile, setProfile } = useAuthStore();
  const db = useFirestore();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isInitializing, setIsInitializing] = useState(true);
  const syncRef = useRef<string | null>(null);

  useEffect(() => {
    // If auth state is settled and there's no user, stop initializing
    if (!isUserLoading && !user) {
      setIsInitializing(false);
      return;
    }

    // If there's a user and we haven't synced yet for this UID
    if (user && syncRef.current !== user.uid) {
      syncRef.current = user.uid;
      const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as any);
        }
        setIsInitializing(false);
      }, (err) => {
        console.error("Profile sync failed:", err);
        setIsInitializing(false);
      });
      return () => unsub();
    }
  }, [user, isUserLoading, db, setProfile]);

  const handleTabChange = useCallback((id: string) => {
    setActiveTab(id);
  }, []);

  if (isUserLoading || (user && isInitializing)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#ECF1F4] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Verifying Clearance...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#ECF1F4] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-2xl mb-6 ring-4 ring-white">
              <ShieldCheck className="text-white w-10 h-10" />
            </div>
            <h1 className="text-4xl font-black text-primary tracking-tighter uppercase italic">RoleFlow</h1>
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

  const getPageTitle = () => {
    switch (activeTab) {
      case "dashboard": return "Operational Overview";
      case "attendance": return "Attendance Tracker";
      case "leave": return "Absence Control";
      case "users": return "Strategic Directory";
      case "tasks": return "Workflow Engine";
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
            <Suspense fallback={<TabLoader />}>
              {activeTab === "dashboard" && <OverviewTab />}
              {activeTab === "attendance" && <AttendanceTab />}
              {activeTab === "leave" && <LeaveManagement />}
              {activeTab === "users" && <UserManagement />}
              {activeTab === "tasks" && <TaskManagement />}
            </Suspense>
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
