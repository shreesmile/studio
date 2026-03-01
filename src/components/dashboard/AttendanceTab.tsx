
"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, where, doc, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { Clock, LogIn, LogOut, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

export function AttendanceTab() {
  const { profile: user } = useAuthStore();
  const db = useFirestore();
  const today = format(new Date(), "yyyy-MM-dd");

  const attendanceQuery = useMemoFirebase(() => {
    if (!user || !user.role) return null;
    let q = query(collection(db, "attendance"));
    
    // Employee sees own, Team Lead/Manager sees department, Admin+ sees all
    if (user.role === 'Employee') {
      q = query(q, where("userId", "==", user.id));
    } else if (user.role === 'Team Lead' || user.role === 'Manager') {
      q = query(q, where("department", "==", user.department));
    }
    
    // Using a simpler query for initial stability
    return query(q, limit(20));
  }, [db, user]);

  const { data: records, isLoading } = useCollection(attendanceQuery);

  const todayRecord = useMemo(() => 
    records?.find(r => r.date === today && r.userId === user?.id),
  [records, today, user?.id]);

  const handleClockIn = () => {
    if (!user) return;
    const now = new Date();
    const isLate = now.getHours() >= 9 && now.getMinutes() > 30;
    
    const record = {
      userId: user.id,
      userName: user.name,
      department: user.department,
      date: today,
      clockIn: now.toISOString(),
      status: isLate ? "Late" : "Present",
      createdAt: serverTimestamp()
    };
    
    addDocumentNonBlocking(collection(db, "attendance"), record);
  };

  const handleClockOut = () => {
    if (!todayRecord || !user) return;
    const now = new Date();
    const clockIn = new Date(todayRecord.clockIn);
    const diffHours = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

    updateDocumentNonBlocking(doc(db, "attendance", todayRecord.id), {
      clockOut: now.toISOString(),
      totalHours: Number(diffHours.toFixed(2)),
      updatedAt: serverTimestamp()
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-1 border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Terminal Access
            </CardTitle>
            <CardDescription>MNC Timekeeping Protocol</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <h2 className="text-3xl font-black text-primary font-mono tracking-tighter">
                {format(new Date(), "HH:mm")}
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">
                {format(new Date(), "EEEE, MMMM do")}
              </p>
            </div>
            
            {!todayRecord ? (
              <Button onClick={handleClockIn} className="w-full h-12 gap-2 text-xs font-bold uppercase tracking-widest">
                <LogIn className="w-4 h-4" />
                Initialize Clock In
              </Button>
            ) : !todayRecord.clockOut ? (
              <Button onClick={handleClockOut} variant="destructive" className="w-full h-12 gap-2 text-xs font-bold uppercase tracking-widest">
                <LogOut className="w-4 h-4" />
                Terminal Clock Out
              </Button>
            ) : (
              <div className="p-4 bg-green-50 border border-green-100 rounded-lg flex flex-col items-center gap-1">
                <CheckCircle className="text-green-600 w-8 h-8" />
                <p className="text-[10px] font-bold text-green-700 uppercase">Shift Completed</p>
                <p className="text-lg font-black text-green-800">{todayRecord.totalHours} hrs</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-sm font-bold">Chronological Logs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary/20" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">In/Out</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {records?.map((rec) => (
                      <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-semibold">{rec.userName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{rec.date}</td>
                        <td className="px-4 py-3 font-mono">
                          {rec.clockIn ? format(new Date(rec.clockIn), "HH:mm") : "--:--"} - {rec.clockOut ? format(new Date(rec.clockOut), "HH:mm") : "--:--"}
                        </td>
                        <td className="px-4 py-3">{rec.totalHours ? `${rec.totalHours}h` : "In Progress"}</td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant={rec.status === 'Late' ? 'destructive' : 'secondary'} className="text-[9px] uppercase">
                            {rec.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {(!records || records.length === 0) && (
                      <tr><td colSpan={5} className="p-10 text-center text-muted-foreground italic">No historical data available in current scope.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
