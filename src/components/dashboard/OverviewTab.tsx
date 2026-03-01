
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
  BrainCircuit
} from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { generatePerformanceInsight, GeneratePerformanceInsightOutput } from "@/ai/flows/ai-performance-insight";

// Mock data for the demo
const mockTasks = [
  { id: '1', title: 'Migrate DB', status: 'completed', assignedToUserId: 'u-employee', createdAt: '2024-01-01' },
  { id: '2', title: 'Fix Auth UI', status: 'in-progress', assignedToUserId: 'u-employee', createdAt: '2024-01-02' },
  { id: '3', title: 'Write Tests', status: 'pending', assignedToUserId: 'u-team-lead', createdAt: '2024-01-03' },
  { id: '4', title: 'Release v1.2', status: 'blocked', assignedToUserId: 'u-employee', createdAt: '2024-01-04', deadline: '2024-01-05' },
];

const mockUsers = [
  { id: 'u-super-admin', name: 'Super Admin', role: 'Super Admin' as const },
  { id: 'u-manager', name: 'Product Manager', role: 'Manager' as const },
  { id: 'u-employee', name: 'John Dev', role: 'Employee' as const },
];

export function OverviewTab() {
  const { user } = useAuth();
  const [aiInsight, setAiInsight] = useState<GeneratePerformanceInsightOutput | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const getInsights = async () => {
    setLoadingAi(true);
    try {
      const res = await generatePerformanceInsight({
        tasks: mockTasks.map(t => ({
          ...t,
          status: t.status as any,
          createdAt: t.createdAt,
          assignedToUserId: t.assignedToUserId
        })),
        users: mockUsers.map(u => ({
          ...u,
          role: u.role as any
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
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Tasks</CardTitle>
            <Clock className="h-4 w-4 text-[#457399]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#2d3748]">24</div>
            <p className="text-xs text-muted-foreground mt-1">+2 from yesterday</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-[#457399]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#2d3748]">12</div>
            <p className="text-xs text-muted-foreground mt-1">50% completion rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm border-none bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#2d3748]">3</div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>
        {(isAdmin || isManager) && (
          <Card className="shadow-sm border-none bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Users</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#2d3748]">18</div>
              <p className="text-xs text-muted-foreground mt-1">Across 4 teams</p>
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
                disabled={loadingAi}
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
                <p className="text-xs">Click to generate AI insights based on team velocity.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm border-none bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground border border-white shadow-sm">JD</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#2d3748]">John Doe completed "UI Design System"</p>
                    <p className="text-[10px] text-muted-foreground">2 hours ago</p>
                  </div>
                  <div className="text-[10px] font-bold text-[#457399] uppercase">Task</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-none bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Role:</span>
                <span className="text-sm font-bold text-accent">{user?.role}</span>
              </div>
              <div className="space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Available Actions</div>
                <div className="grid grid-cols-2 gap-3">
                  {["Manage Users", "Assign Tasks", "View Reports", "Edit Profile"].map((action) => (
                    <Button key={action} variant="outline" className="h-9 text-[10px] bg-[#f8fafc] hover:bg-accent/5 hover:text-accent border-muted shadow-none">
                      {action}
                    </Button>
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
