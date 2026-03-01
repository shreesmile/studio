"use client";

import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Users, 
  Sparkles, 
  TrendingUp,
  BrainCircuit,
  Loader2
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { generatePerformanceInsight, GeneratePerformanceInsightOutput } from "@/ai/flows/ai-performance-insight";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, where } from "firebase/firestore";

export function OverviewTab() {
  const { profile: user } = useAuthStore();
  const db = useFirestore();
  const [aiInsight, setAiInsight] = useState<GeneratePerformanceInsightOutput | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // CRITICAL: Fetch Users only if user profile is ready and has permission
  const usersRef = useMemoFirebase(() => {
    if (!user || user.role === 'Employee') return null;
    return collection(db, "users");
  }, [db, user]);
  const { data: usersData, isLoading: loadingUsers } = useCollection(usersRef);

  // CRITICAL: Fetch Recent Activity only if user profile is ready
  const recentTasksQuery = useMemoFirebase(() => {
    if (!user) return null;
    let q = query(collection(db, "tasks"));

    // Apply strict filters to avoid security rule denials
    switch (user.role) {
      case 'Super Admin': break;
      case 'Admin':
        q = query(q, where("assignedByRole", "!=", "Super Admin"));
        break;
      case 'Manager':
      case 'Team Lead':
        q = query(q, where("assignedToDepartment", "==", user.department));
        break;
      case 'Employee':
        q = query(q, where("assignedToId", "==", user.id));
        break;
    }

    return query(q, orderBy("createdAt", "desc"), limit(5));
  }, [db, user]);
  
  const { data: recentTasks, isLoading: loadingTasks } = useCollection(recentTasksQuery);

  const getInsights = async () => {
    if (!usersData || !recentTasks) return;
    setLoadingAi(true);
    try {
      const res = await generatePerformanceInsight({
        tasks: recentTasks.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status || 'pending',
          createdAt: t.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          assignedToUserId: t.assignedToId || 'unknown'
        })),
        users: usersData.map(u => ({
          id: u.id,
          name: u.name,
          role: u.role
        })),
        context: "Focus on task completion rates and potential delays."
      });
      setAiInsight(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAi(false);
    }
  };

  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';
  const isManager = user?.role === 'Manager';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm border-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Tasks</CardTitle>
            <Clock className="h-4 w-4 text-[#457399]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#2d3748]">
              {loadingTasks ? <Loader2 className="h-6 w-6 animate-spin inline" /> : (recentTasks?.length || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Authorized workflow scope</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completion Status</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-[#457399]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#2d3748]">
              {recentTasks?.filter(t => t.status === 'completed').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tasks finalized in current view</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm border-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Status</CardTitle>
            <AlertCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#2d3748]">Active</div>
            <p className="text-xs text-muted-foreground mt-1">Real-time sync enabled</p>
          </CardContent>
        </Card>
        {(isAdmin || isManager) && (
          <Card className="shadow-sm border-none bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Directory Reach</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#2d3748]">
                {loadingUsers ? <Loader2 className="h-6 w-6 animate-spin inline" /> : (usersData?.length || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Visible organizational members</p>
            </CardContent>
          </Card>
        )}
      </div>

      {(isAdmin || isManager) && (
        <Card className="border-accent/10 bg-accent/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <BrainCircuit className="h-5 w-5 text-accent" />
                  AI Performance Insights
                </CardTitle>
                <CardDescription>
                  Real-time strategic analysis of workflow efficiency.
                </CardDescription>
              </div>
              <Button 
                onClick={getInsights} 
                disabled={loadingAi || loadingUsers || loadingTasks}
                variant="outline"
                className="bg-white hover:bg-accent hover:text-white h-9 text-xs"
              >
                {loadingAi ? "Analyzing..." : "Refresh Insights"}
                <Sparkles className="ml-2 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {aiInsight ? (
              <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                <div className="p-4 rounded-lg bg-white/50 border border-white/40">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    Executive Summary
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {aiInsight.summary}
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Key Insights</h5>
                    <ul className="space-y-1">
                      {aiInsight.keyInsights.map((ki, i) => (
                        <li key={i} className="text-xs flex items-start gap-2">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-accent shrink-0" />
                          {ki}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 opacity-60">
                <BrainCircuit className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs">Click to generate AI insights based on current team data.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm border-none bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Recent System Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {loadingTasks ? (
                <Loader2 className="h-6 w-6 animate-spin mx-auto opacity-20" />
              ) : recentTasks && recentTasks.length > 0 ? (
                recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground border border-white shadow-sm">
                      {task.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#2d3748]">{task.title}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{task.status}</p>
                    </div>
                    <div className="text-[10px] font-bold text-[#457399]">REAL-TIME</div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No recent task activity detected.</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-none bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Role Capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Authenticated as:</span>
                <span className="text-sm font-bold text-accent">{user?.role}</span>
              </div>
              <div className="space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Authorized Contexts</div>
                <div className="grid grid-cols-2 gap-3">
                  {["Auth Audit", "Task Tracking", "Insight Engine", "Directory"].map((action) => (
                    <div key={action} className="h-9 flex items-center justify-center text-[10px] bg-[#f8fafc] border border-muted rounded-md text-muted-foreground">
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}