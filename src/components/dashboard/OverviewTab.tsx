"use client";

import React from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Sparkles, 
  BrainCircuit, 
  Loader2, 
  Briefcase, 
  BarChart3
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, limit, or } from "firebase/firestore";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export const OverviewTab = React.memo(() => {
  const { profile: user } = useAuthStore();
  const { user: authUser } = useUser();
  const db = useFirestore();

  const projectsQuery = useMemoFirebase(() => {
    if (!authUser || !user || !user.role || !user.department || user.id !== authUser.uid) {
      return null;
    }
    
    let q = collection(db, "projects");
    
    if (user.role === 'Super Admin' || user.role === 'Admin') {
      return query(q, limit(10));
    }
    
    const filters = [
      where("assignedUsers", "array-contains", authUser.uid),
      where("createdBy", "==", authUser.uid)
    ];

    if (user.role === 'Manager' || user.role === 'Team Lead') {
      filters.push(where("department", "==", user.department));
    }
    
    return query(q, or(...filters), limit(10));
  }, [db, user, authUser]);

  const { data: projects, isLoading: loadingProjects } = useCollection(projectsQuery);

  const logsQuery = useMemoFirebase(() => {
    if (!authUser || !user || !user.role || !user.department || user.id !== authUser.uid) return null;
    let q = collection(db, "work_logs");
    
    if (user.role === 'Employee') return query(q, where("userId", "==", authUser.uid), limit(20));
    if (user.role === 'Super Admin' || user.role === 'Admin') return query(q, limit(20));
    
    return query(q, where("department", "==", user.department), limit(20));
  }, [db, user, authUser]);

  const { data: logs, isLoading: loadingLogs } = useCollection(logsQuery);

  const totalEffort = React.useMemo(() => 
    logs?.reduce((acc, l) => acc + (l.totalHours || 0), 0).toFixed(1) || "0",
  [logs]);

  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-dashboard');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="relative w-full h-32 rounded-3xl overflow-hidden shadow-sm mb-8 bg-muted">
        {heroImage && (
          <Image 
            src={heroImage.imageUrl}
            alt="RoleFlow Command Center Background"
            fill
            className="object-cover opacity-80"
            priority // Critical for LCP
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center px-8">
          <div>
            <h2 className="text-white text-2xl font-black uppercase tracking-tighter">Welcome, {user?.name.split(' ')[0]}</h2>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Clearance: {user?.role}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Projects</CardDescription>
            <CardTitle className="text-3xl font-black text-primary">
              {loadingProjects ? <Loader2 className="w-6 h-6 animate-spin opacity-20" /> : projects?.length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-[9px] font-bold text-green-600 uppercase">
              <TrendingUp className="w-3 h-3" aria-hidden="true" />
              Strategic Growth
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Production Effort</CardDescription>
            <CardTitle className="text-3xl font-black text-primary">{totalEffort}h</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[9px] font-bold text-muted-foreground uppercase">Captured Performance</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Department Unit</CardDescription>
            <CardTitle className="text-3xl font-black text-accent truncate">{user?.department || "Operational"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[9px] font-bold text-muted-foreground uppercase">Assigned Command</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">System Integrity</CardDescription>
            <CardTitle className="text-3xl font-black text-primary">SECURE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[9px] font-bold text-muted-foreground uppercase">Sync Protocol Active</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-none shadow-md bg-white overflow-hidden">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest">
              <BarChart3 className="w-4 h-4 text-primary" aria-hidden="true" />
              Strategic Insight
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-muted/50">
              {projects?.slice(0, 5).map(p => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground uppercase tracking-tighter">{p.name}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-medium">Priority: {p.priority} • {p.status}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[8px] font-black tracking-widest uppercase">
                    {p.status === 'Completed' ? 'ARCHIVED' : 'ACTIVE'}
                  </Badge>
                </div>
              ))}
              {(!projects || projects.length === 0) && !loadingProjects && (
                <div className="p-8 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
                  No active strategic assets in scope.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-accent/10 bg-accent/5 shadow-inner">
            <CardHeader>
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-accent" aria-hidden="true" />
                AI Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                "System analysis indicates {user?.department || "General"} unit is maintaining optimal KPIs. Recommendation: Finalize pending task approvals for efficiency spikes."
              </p>
              <Button variant="outline" size="sm" className="w-full text-[9px] font-black uppercase tracking-widest border-accent/20 text-accent hover:bg-accent/10">
                Synchronize Strategy
                <Sparkles className="ml-2 w-3 h-3" aria-hidden="true" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

OverviewTab.displayName = "OverviewTab";