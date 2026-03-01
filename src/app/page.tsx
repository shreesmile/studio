
"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { ShieldCheck, Lock, LayoutDashboard, Loader2, LogOut, RefreshCcw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useUser, useFirestore, FirebaseClientProvider } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { LoginForm } from "@/components/auth/LoginForm";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { useAuth } from "@/firebase";

function DashboardContent() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { profile, setProfile, logout: clearStore } = useAuthStore();
  const db = useFirestore();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSyncing, setIsSyncing] = useState(false);
  const syncAttemptedFor = useRef<string | null>(null);

  // Sync Firebase User with Firestore Profile
  useEffect(() => {
    let isMounted = true;
    
    // Condition: We have a user, no local profile, we aren't already syncing, and we haven't failed for this UID yet.
    if (user && !profile && !isSyncing && syncAttemptedFor.current !== user.uid) {
      const fetchProfile = async () => {
        if (!isMounted) return;
        setIsSyncing(true);
        syncAttemptedFor.current = user.uid;
        
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && isMounted) {
            setProfile(docSnap.data() as any);
          }
        } catch (error) {
          console.error("Profile sync error:", error);
        } finally {
          if (isMounted) setIsSyncing(false);
        }
      };
      fetchProfile();
    } else if (!user && profile) {
      // Clear store if logged out
      clearStore();
      syncAttemptedFor.current = null;
    }
    
    return () => { isMounted = false; };
  }, [user, profile, db, setProfile, clearStore]); // isSyncing removed from deps to prevent infinite loop

  // Tab permission check
  useEffect(() => {
    if (profile?.role) {
      const adminRoles: UserRole[] = ['Super Admin', 'Admin', 'Manager', 'Team Lead'];
      if (activeTab === 'users' && !adminRoles.includes(profile.role)) {
        setActiveTab('dashboard');
      }
    }
  }, [profile, activeTab]);

  const handleManualLogout = async () => {
    await signOut(auth);
    await fetch('/api/auth/session', { method: 'POST', body: JSON.stringify({ idToken: null }) });
    clearStore();
    syncAttemptedFor.current = null;
    window.location.reload(); // Hard refresh to clear all states
  };

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#ECF1F4] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">Verifying credentials...</p>
      </div>
    );
  }

  if (user && !profile) {
    if (isSyncing) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#ECF1F4] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
          <p className="text-sm font-semibold text-muted-foreground">Initializing profile...</p>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-[#ECF1F4] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <RefreshCcw className="text-destructive w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Profile Not Synchronized</h2>
            <p className="text-sm text-muted-foreground">
              We found your account but couldn't retrieve your role assignment. This might happen if your profile is still being created.
            </p>
          </div>
          <div className="pt-4 flex flex-col gap-3">
            <Button onClick={() => window.location.reload()} className="w-full h-12">
              Retry Synchronization
            </Button>
            <Button variant="ghost" onClick={handleManualLogout} className="w-full text-muted-foreground">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#ECF1F4] flex flex-col items-center justify-center p-6">
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
      case "dashboard": return <OverviewTab />;
      case "users": return <UserManagement />;
      case "tasks": return <TaskManagement />;
      case "analytics":
        return (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border border-dashed text-muted-foreground">
            <LayoutDashboard className="h-12 w-12 mb-4 opacity-20" />
            <p>Analytical module data is loading...</p>
          </div>
        );
      default: return <OverviewTab />;
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
      <div className="flex min-h-screen w-full bg-[#ECF1F4]">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <SidebarInset className="bg-transparent">
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
                <span className="ml-1 text-[10px] font-bold text-accent uppercase">{profile?.role}</span>
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
