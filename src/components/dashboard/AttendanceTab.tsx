
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuthStore, ROLE_WEIGHTS } from "@/lib/auth-store";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, query, where, doc, limit, serverTimestamp } from "firebase/firestore";
import { Clock, LogIn, LogOut, CheckCircle, Loader2, Briefcase, FileText, Zap } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export function AttendanceTab() {
  const { profile: user } = useAuthStore();
  const { user: authUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [today, setToday] = useState<string>("");

  useEffect(() => {
    setCurrentTime(new Date());
    setToday(format(new Date(), "yyyy-MM-dd"));
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const [project, setProject] = useState("");
  const [notes, setNotes] = useState("");
  const [dailyWorkTime, setDailyWorkTime] = useState("");

  const attendanceQuery = useMemoFirebase(() => {
    if (!authUser || !user || user.id !== authUser.uid || !user.role || !user.department) return null;
    
    let q = collection(db, "attendance");
    const userWeight = ROLE_WEIGHTS[user.role] || 0;
    
    // Performance: Remove orderBy to avoid composite index requirement in prototype
    if (userWeight >= 4) {
      return query(q, limit(50));
    }

    if (userWeight >= 2) {
      return query(q, where("department", "==", user.department), limit(50));
    }

    return query(q, where("userId", "==", authUser.uid), limit(50));
  }, [db, user, authUser]);

  const { data: rawRecords, isLoading } = useCollection(attendanceQuery);

  // Client-side sorting to resolve "Query requires an index" errors
  const records = useMemo(() => {
    if (!rawRecords) return [];
    return [...rawRecords].sort((a, b) => {
      const dateA = new Date(a.clockIn || 0).getTime();
      const dateB = new Date(b.clockIn || 0).getTime();
      return dateB - dateA;
    });
  }, [rawRecords]);

  const todayRecord = useMemo(() => 
    records?.find(r => r.date === today && r.userId === (user?.id || authUser?.uid)),
  [records, today, user?.id, authUser?.uid]);

  const handleClockIn = () => {
    if (!authUser || !user) return;
    if (!project.trim()) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please specify the active project." });
      return;
    }

    const now = new Date();
    const isLate = now.getHours() >= 9 && now.getMinutes() > 30;
    
    const record = {
      userId: authUser.uid,
      userName: user.name,
      department: user.department,
      date: today,
      clockIn: now.toISOString(),
      status: isLate ? "Late" : "Present",
      project: project.trim(),
      notes: notes.trim(),
      dailyWorkTime: dailyWorkTime || "0",
      createdAt: serverTimestamp()
    };
    
    addDocumentNonBlocking(collection(db, "attendance"), record);
    toast({ title: "Clocked In", description: "Identity synchronized for current operation." });
  };

  const handleClockOut = () => {
    if (!todayRecord || !authUser) return;
    const now = new Date();
    const clockIn = new Date(todayRecord.clockIn);
    const diffHours = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

    updateDocumentNonBlocking(doc(db, "attendance", todayRecord.id), {
      clockOut: now.toISOString(),
      totalHours: Number(diffHours.toFixed(2)),
      updatedAt: serverTimestamp()
    });

    toast({ title: "Clocked Out", description: "Operational cycle completed." });
  };

  if (!currentTime) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-1 border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Operational Sync
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Attendance & Work Time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <h2 className="text-3xl font-black text-primary font-mono tracking-tighter">
                {format(currentTime, "HH:mm")}
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">
                {format(currentTime, "EEEE, MMMM do")}
              </p>
            </div>
            
            {!todayRecord ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> Project Deployment
                  </Label>
                  <Input 
                    placeholder="Active workspace name..." 
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    className="bg-white text-xs h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Daily Work Time (Hours)
                  </Label>
                  <Input 
                    type="number"
                    placeholder="Estimated hours..." 
                    value={dailyWorkTime}
                    onChange={(e) => setDailyWorkTime(e.target.value)}
                    className="bg-white text-xs h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Shift Notes
                  </Label>
                  <Textarea 
                    placeholder="Brief objective summary..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-white text-xs min-h-[60px]"
                  />
                </div>
                <Button onClick={handleClockIn} className="w-full h-11 gap-2 text-xs font-bold uppercase tracking-widest">
                  <LogIn className="w-4 h-4" /> Initialize Clock In
                </Button>
              </div>
            ) : !todayRecord.clockOut ? (
              <div className="space-y-4">
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Active Production</p>
                  <p className="text-sm font-bold truncate mt-1">{todayRecord.project}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">Work Time: {todayRecord.dailyWorkTime || 0} hrs</p>
                </div>
                <Button onClick={handleClockOut} variant="destructive" className="w-full h-11 gap-2 text-xs font-bold uppercase tracking-widest">
                  <LogOut className="w-4 h-4" /> Terminal Clock Out
                </Button>
              </div>
            ) : (
              <div className="p-6 bg-green-50 border border-green-100 rounded-xl flex flex-col items-center gap-1">
                <CheckCircle className="text-green-600 w-10 h-10 mb-2" />
                <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Cycle Finalized</p>
                <p className="text-2xl font-black text-green-800">{todayRecord.dailyWorkTime || todayRecord.totalHours || 0} Hrs</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-sm font-bold uppercase tracking-tighter">Enterprise Synchronization Logs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary/20" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Personnel</th>
                      <th className="px-4 py-3">Workspace</th>
                      <th className="px-4 py-3">Cycle</th>
                      <th className="px-4 py-3">Production</th>
                      <th className="px-4 py-3 text-right">Clearance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-semibold">
                          {rec.userName}
                          <p className="text-[9px] text-muted-foreground uppercase">{rec.date}</p>
                        </td>
                        <td className="px-4 py-3 font-bold text-primary">{rec.project || "N/A"}</td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-[10px]">
                            {rec.clockIn ? format(new Date(rec.clockIn), "HH:mm") : "--"} - {rec.clockOut ? format(new Date(rec.clockOut), "HH:mm") : "--"}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-black">{rec.dailyWorkTime || rec.totalHours || "0"} hrs</td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant={rec.status === 'Late' ? 'destructive' : 'secondary'} className="text-[8px] font-black tracking-widest uppercase">
                            {rec.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {(!records || records.length === 0) && (
                      <tr><td colSpan={5} className="p-20 text-center text-muted-foreground italic uppercase tracking-widest text-[10px] opacity-40">No identity synchronization logs available.</td></tr>
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
