
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarCheck, TrendingUp, Sparkles, BrainCircuit, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, limit } from "firebase/firestore";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export function OverviewTab() {
  const { profile: user } = useAuthStore();
  const db = useFirestore();
  const today = format(new Date(), "yyyy-MM-dd");

  const attendanceQuery = useMemoFirebase(() => {
    if (!user) return null;
    let q = query(collection(db, "attendance"), where("date", "==", today));
    
    if (user.role === 'Employee') {
      q = query(q, where("userId", "==", user.id));
    } else if (['Team Lead', 'Manager'].includes(user.role)) {
      q = query(q, where("department", "==", user.department));
    }
    return q;
  }, [db, user, today]);

  const { data: todayAttendance, isLoading: loadingAtt } = useCollection(attendanceQuery);

  const usersQuery = useMemoFirebase(() => {
    // Only authorized roles should even attempt to list users
    if (!user || !['Super Admin', 'Admin', 'Manager', 'Team Lead'].includes(user.role)) return null;
    return query(collection(db, "users"), limit(100));
  }, [db, user]);

  const { data: users, isLoading: loadingUsers } = useCollection(usersQuery);

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Team Attendance</CardDescription>
            <CardTitle className="text-3xl font-black text-primary">
              {loadingAtt ? "..." : todayAttendance?.length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-[9px] font-bold text-green-600 uppercase">
              <TrendingUp className="w-3 h-3" />
              Active Status
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Department Size</CardDescription>
            <CardTitle className="text-3xl font-black text-primary">
              {loadingUsers ? "..." : users?.filter(u => u.department === user?.department).length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[9px] font-bold text-muted-foreground uppercase">{user?.department || "N/A"} Unit</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pending Leaves</CardDescription>
            <CardTitle className="text-3xl font-black text-accent">0</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[9px] font-bold text-muted-foreground uppercase">Approval Queue</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Shift Progress</CardDescription>
            <CardTitle className="text-3xl font-black text-primary">82%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[9px] font-bold text-muted-foreground uppercase">Optimal Efficiency</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-none shadow-md bg-white">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest">
              <CalendarCheck className="w-4 h-4 text-primary" />
              Real-time Operations log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {todayAttendance?.map(att => (
                <div key={att.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${att.clockOut ? 'bg-gray-400' : 'bg-green-500 animate-pulse'}`} />
                    <div>
                      <p className="text-xs font-bold text-foreground">{att.userName}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-medium">{att.department} • Clocked at {att.clockIn ? format(new Date(att.clockIn), "HH:mm") : "--:--"}</p>
                    </div>
                  </div>
                  <Badge variant={att.status === 'Late' ? 'destructive' : 'secondary'} className="text-[8px] font-black tracking-widest uppercase">
                    {att.status}
                  </Badge>
                </div>
              ))}
              {(!todayAttendance || todayAttendance.length === 0) && (
                <div className="p-10 text-center text-muted-foreground text-[10px] uppercase font-bold tracking-widest opacity-40">
                  No active operations detected in current cycle
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/10 bg-accent/5 shadow-inner">
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-accent" />
              AI Insight Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[11px] text-muted-foreground leading-relaxed italic">
              "System analysis indicates high engagement in the {user?.department || "general"} unit. Recommendations: Adjust break schedules for optimized output."
            </p>
            <Button variant="outline" size="sm" className="w-full text-[9px] font-black uppercase tracking-widest border-accent/20 text-accent hover:bg-accent/10">
              Refresh Neural Context
              <Sparkles className="ml-2 w-3 h-3" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
