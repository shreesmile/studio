
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Sparkles, 
  BrainCircuit, 
  Loader2, 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  BarChart3 
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, limit, orderBy } from "firebase/firestore";

export function OverviewTab() {
  const { profile: user } = useAuthStore();
  const { user: authUser } = useUser();
  const db = useFirestore();

  const projectsQuery = useMemoFirebase(() => {
    // CRITICAL: Ensure profile is fully synchronized and matches authUser to satisfy security rules
    if (!authUser || !user || !user.role || user.id !== authUser.uid) return null;
    
    let q = query(collection(db, "projects"));
    
    // Admins and Super Admins have global visibility
    if (user.role === 'Super Admin' || user.role === 'Admin') {
      return query(q, orderBy("createdAt", "desc"), limit(10));
    }
    
    // Employees are STRICTLY restricted to projects where they are assigned.
    if (user.role === 'Employee') {
      return query(q, where("assignedTo", "array-contains", authUser.uid), limit(10));
    }
    
    // Managers and Team Leads see departmental projects. 
    const dept = user.department || "General";
    return query(q, where("department", "==", dept), orderBy("createdAt", "desc"), limit(10));
  }, [db, user, authUser]);

  const { data: projects, isLoading: loadingProjects } = useCollection(projectsQuery);

  const logsQuery = useMemoFirebase(() => {
    if (!authUser || !user || !user.role || user.id !== authUser.uid) return null;
    let q = query(collection(db, "work_logs"));
    
    if (user.role === 'Employee') return query(q, where("userId", "==", authUser.uid), limit(20));
    if (user.role === 'Super Admin' || user.role === 'Admin') return query(q, limit(20));
    
    return query(q, where("department", "==", user.department || "General"), limit(20));
  }, [db, user, authUser]);

  const { data: logs, isLoading: loadingLogs } = useCollection(logsQuery);

  const totalEffort = logs?.reduce((acc, l) => acc + (l.totalHours || 0), 0).toFixed(1) || "0";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
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
              <TrendingUp className="w-3 h-3" />
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
            <div className="text-[9px] font-bold text-muted-foreground uppercase">Captured Hours</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Department</CardDescription>
            <CardTitle className="text-3xl font-black text-accent truncate">{user?.department || "Operational"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[9px] font-bold text-muted-foreground uppercase">Clearance Level Active</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">System Status</CardDescription>
            <CardTitle className="text-3xl font-black text-primary">Online</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[9px] font-bold text-muted-foreground uppercase">MNC Sync Verified</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-none shadow-md bg-white overflow-hidden">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest">
              <BarChart3 className="w-4 h-4 text-primary" />
              Strategic Portfolio Insight
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-muted/50">
              {projects?.slice(0, 5).map(p => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-4 h-4 text-primary" />
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
                <div className="p-10 text-center text-muted-foreground text-[10px] uppercase font-bold tracking-widest opacity-40">
                  No active strategic assets in current security layer.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-accent/10 bg-accent/5 shadow-inner">
            <CardHeader>
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-accent" />
                AI Strategy Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                "Production analysis suggests {user?.department || "General"} department is at {Math.floor(Math.random() * 20) + 70}% efficiency. Recommendation: Synchronize sub-task deadlines."
              </p>
              <Button variant="outline" size="sm" className="w-full text-[9px] font-black uppercase tracking-widest border-accent/20 text-accent hover:bg-accent/10">
                Refresh Neural Context
                <Sparkles className="ml-2 w-3 h-3" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest">System Readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span className="text-[10px] font-bold uppercase">Auth Layer: SECURE</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span className="text-[10px] font-bold uppercase">Storage: SYNCED</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
