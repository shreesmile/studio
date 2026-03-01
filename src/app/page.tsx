
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

import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { UserManagement } from "@/components/dashboard/UserManagement";
import { AttendanceTab } from "@/components/dashboard/AttendanceTab";
import { LeaveManagement } from "@/components/dashboard/LeaveManagement";
import { TaskManagement } from "@/components/dashboard/TaskManagement";

function DashboardContent() {
  const { user, isUserLoading } = useUser();
  const { profile, setProfile, logout: clearProfile } = useAuthStore();
  const db = useFirestore();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isInitializing, setIsInitializing] = useState(true);
  const syncRef = useRef<string | null>(null);

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      clearProfile();
      syncRef.current = null;
      setIsInitializing(false);
      return;
    }

    // Only sync if the user has changed
    if (user && syncRef.current !== user.uid) {
      syncRef.current = user.uid;
      setIsInitializing(true);
      
      const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(data as any);
        }
        setIsInitializing(false);
      }, (err) => {
        console.error("Profile synchronization failure:", err);
        setIsInitializing(false);
      });
      return () => {
        unsub();
      };
    }
  }, [user, isUserLoading, db, setProfile, clearProfile]);

  const handleTabChange = useCallback((id: string) => {
    setActiveTab(id);
  }, []);

  if (isUserLoading || (user && (isInitializing || !profile || profile.id !== user.uid))) {
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

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <OverviewTab />;
      case "attendance": return <AttendanceTab />;
      case "leave": return <LeaveManagement />;
      case "users": return <UserManagement />;
      case "tasks": return <TaskManagement />;
      default: return <OverviewTab />;
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
