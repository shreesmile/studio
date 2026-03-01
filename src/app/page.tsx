
"use client";

import React, { useState, useEffect, useRef } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { UserManagement } from "@/components/dashboard/UserManagement";
import { AttendanceTab } from "@/components/dashboard/AttendanceTab";
import { LeaveManagement } from "@/components/dashboard/LeaveManagement";
import { TaskManagement } from "@/components/dashboard/TaskManagement";
import { useAuthStore } from "@/lib/auth-store";
import { ShieldCheck, Lock, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useUser, useFirestore, FirebaseClientProvider, useAuth } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { LoginForm } from "@/components/auth/LoginForm";

function DashboardContent() {
  const { user, isUserLoading } = useUser();
  const { profile, setProfile } = useAuthStore();
  const db = useFirestore();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSyncing, setIsSyncing] = useState(false);
  const syncRef = useRef<string | null>(null);

  useEffect(() => {
    if (user && !profile && !isSyncing && syncRef.current !== user.uid) {
      const fetchProfile = async () => {
        setIsSyncing(true);
        syncRef.current = user.uid;
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as any);
          }
        } catch (error) {
          console.error("Profile sync error:", error);
        } finally {
          setIsSyncing(false);
        }
      };
      fetchProfile();
    }
  }, [user, profile, db, setProfile, isSyncing]);

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#ECF1F4] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Validating Credentials</p>
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
            <p className="mt-2 text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Enterprise Time Management System</p>
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

  if (isSyncing || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#ECF1F4] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Initializing Profile Sync</p>
      </div>
    );
  }

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
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
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
                <p className="text-[11px] font-black text-accent uppercase">{profile.role}</p>
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
