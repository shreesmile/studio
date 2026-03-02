
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { useAuthStore } from "@/lib/auth-store";
import { ShieldCheck, Lock, Loader2, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useUser, useFirestore, FirebaseClientProvider, useAuth } from "@/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { LoginForm } from "@/components/auth/LoginForm";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";

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
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isInitializing, setIsInitializing] = useState(true);
  const [profileMissing, setProfileMissing] = useState(false);
  const syncRef = useRef<string | null>(null);

  useEffect(() => {
    if (isUserLoading) return;

    if (!authUser) {
      console.log("[Auth] No authenticated user found.");
      clearProfile();
      syncRef.current = null;
      setIsInitializing(false);
      setProfileMissing(false);
      return;
    }

    // Only subscribe if the user ID has changed or profile is missing
    if (authUser && (syncRef.current !== authUser.uid || !profile || profile.id !== authUser.uid)) {
      console.log(`[ProfileSync] Initializing profile discovery for UID: ${authUser.uid}`);
      syncRef.current = authUser.uid;
      setIsInitializing(true);
      setProfileMissing(false);
      
      const unsub = onSnapshot(doc(db, "users", authUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log(`[ProfileSync] Profile identified: ${data.name} (${data.role})`);
          setProfile(data as any);
          setProfileMissing(false);
        } else {
          console.warn(`[ProfileSync] Profile missing for UID: ${authUser.uid}`);
          setProfileMissing(true);
        }
        setIsInitializing(false);
      }, (err) => {
        console.error("[ProfileSync] Synchronization failure:", err);
        setProfileMissing(true);
        setIsInitializing(false);
      });
      return () => unsub();
    } else if (authUser && profile && profile.id === authUser.uid) {
      setIsInitializing(false);
    }
  }, [authUser, isUserLoading, db, setProfile, clearProfile, profile]);

  const handleTabChange = useCallback((id: string) => {
    console.log(`[Navigation] Transitioning to: ${id}`);
    setActiveTab(id);
  }, []);

  const handleLogout = async () => {
    console.log("[Auth] Logout sequence initiated.");
    await signOut(auth);
    clearProfile();
    window.location.reload();
  };

  if (isUserLoading || (authUser && isInitializing)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#ECF1F4] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Synchronizing Terminal Clearance...</p>
      </div>
    );
  }

  if (profileMissing) {
    return (
      <div className="min-h-screen bg-[#ECF1F4] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl space-y-6 border border-destructive/20">
          <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="text-destructive w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black uppercase tracking-tighter text-foreground">Clearance denied</h1>
            <p className="text-xs text-muted-foreground leading-relaxed px-4">
              Your authentication is valid, but an organizational profile (Role/Dept) was not found in the directory.
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="w-full h-12 uppercase tracking-widest font-black text-[10px]">
            Return to Login Terminal
          </Button>
        </div>
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
              Secure Enterprise Clearance
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
                <p className="text-[9px] font-bold text-muted-foreground uppercase leading-none">Status</p>
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
