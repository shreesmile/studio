
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+2 from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">50% completion rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        {(isAdmin || isManager) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">18</div>
              <p className="text-xs text-muted-foreground">Across 4 teams</p>
            </CardContent>
          </Card>
        )}
      </div>

      {(isAdmin || isManager) && (
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-accent" />
                  AI Performance Insights
                </CardTitle>
                <CardDescription>
                  Real-time strategic analysis of your team's workflow and bottlenecks.
                </CardDescription>
              </div>
              <Button 
                onClick={getInsights} 
                disabled={loadingAi}
                variant="outline"
                className="bg-background hover:bg-accent hover:text-white"
              >
                {loadingAi ? "Analyzing..." : "Refresh Insights"}
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {aiInsight ? (
              <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                <div className="p-4 rounded-lg bg-background/50 border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    Executive Summary
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {aiInsight.summary}
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h5 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Key Insights</h5>
                    <ul className="space-y-1">
                      {aiInsight.keyInsights.map((ki, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                          {ki}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {aiInsight.potentialBottlenecks && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Potential Bottlenecks</h5>
                      <ul className="space-y-1">
                        {aiInsight.potentialBottlenecks.map((pb, i) => (
                          <li key={i} className="text-sm flex items-start gap-2 text-destructive">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {pb}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 opacity-60">
                <BrainCircuit className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm">Click the button to generate AI insights based on current task velocity and team status.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold">JD</div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">John Doe completed "UI Design System"</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                  <div className="text-xs font-medium text-primary">Task</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Role:</span>
                <span className="font-bold text-accent">{user?.role}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium uppercase text-muted-foreground mb-1">
                  <span>Available Actions</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded border bg-muted/30 text-[10px] text-center">Manage Users</div>
                  <div className="p-2 rounded border bg-muted/30 text-[10px] text-center">Assign Tasks</div>
                  <div className="p-2 rounded border bg-muted/30 text-[10px] text-center">View Reports</div>
                  <div className="p-2 rounded border bg-muted/30 text-[10px] text-center">Edit Profile</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
