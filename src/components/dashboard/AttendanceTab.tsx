
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/auth-store";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, query, where, doc, limit, serverTimestamp, orderBy } from "firebase/firestore";
import { Clock, LogIn, LogOut, CheckCircle, Loader2, Briefcase, FileText } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export function AttendanceTab() {
  const { profile: user } = useAuthStore();
  const { user: authUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  // Prevent hydration mismatch by initializing time-sensitive data in useEffect
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

  const attendanceQuery = useMemoFirebase(() => {
    // SECURITY: Must wait for full identity handshake to satisfy list rules
    if (!authUser || !user || user.id !== authUser.uid || !user.role || !user.department) return null;
    
    let q = collection(db, "attendance");
    
    // Admins and Super Admins can list all records
    if (user.role === 'Super Admin' || user.role === 'Admin') {
      return query(q, orderBy("clockIn", "desc"), limit(50));
    }

    // Managers and Team Leads are scoped to their department
    if (['Team Lead', 'Manager'].includes(user.role)) {
      return query(q, where("department", "==", user.department), orderBy("clockIn", "desc"), limit(50));
    }

    // Employees are strictly limited to their own records
    return query(q, where("userId", "==", authUser.uid), orderBy("clockIn", "desc"), limit(50));
  }, [db, user, authUser]);

  const { data: records, isLoading } = useCollection(attendanceQuery);

  const todayRecord = useMemo(() => 
    records?.find(r => r.date === today && r.userId === (user?.id || authUser?.uid)),
  [records, today, user?.id, authUser?.uid]);

  const handleClockIn = () => {
    if (!authUser || !user) return;
    if (!project.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please specify the project you are working on."
      });
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
      createdAt: serverTimestamp()
    };
    
    addDocumentNonBlocking(collection(db, "attendance"), record);
    toast({
      title: "Clocked In",
      description: `Shift initialized for project: ${project}`
    });
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

    toast({
      title: "Clocked Out",
      description: "Shift successfully finalized."
    });
  };

  if (!currentTime) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-1 border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Terminal Access
            </CardTitle>
            <CardDescription>Enterprise Operational Sync</CardDescription>
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
                    <Briefcase className="w-3 h-3" /> Assigned Project
                  </Label>
                  <Input 
                    placeholder="e.g., Enterprise Portal" 
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    className="bg-white text-xs h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Shift Notes (Optional)
                  </Label>
                  <Textarea 
                    placeholder="Describe your intended outcomes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-white text-xs min-h-[60px]"
                  />
                </div>
                <Button onClick={handleClockIn} className="w-full h-12 gap-2 text-xs font-bold uppercase tracking-widest">
                  <LogIn className="w-4 h-4" />
                  Initialize Clock In
                </Button>
              </div>
            ) : !todayRecord.clockOut ? (
              <div className="space-y-4">
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Active Task</p>
                  <p className="text-sm font-bold truncate mt-1">{todayRecord.project}</p>
                </div>
                <Button onClick={handleClockOut} variant="destructive" className="w-full h-12 gap-2 text-xs font-bold uppercase tracking-widest">
                  <LogOut className="w-4 h-4" />
                  Terminal Clock Out
                </Button>
              </div>
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
            <CardTitle className="text-sm font-bold">Organizational Time Logs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary/20" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Shift Details</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3 text-right">Clearance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {records?.map((rec) => (
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
                          <p className="text-[9px] text-muted-foreground italic truncate max-w-[150px]" title={rec.notes}>
                            {rec.notes || "No operational notes provided."}
                          </p>
                        </td>
                        <td className="px-4 py-3">{rec.totalHours ? `${rec.totalHours}h` : "Operational"}</td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant={rec.status === 'Late' ? 'destructive' : 'secondary'} className="text-[8px] font-black tracking-widest uppercase">
                            {rec.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {(!records || records.length === 0) && (
                      <tr><td colSpan={5} className="p-10 text-center text-muted-foreground italic uppercase tracking-widest text-[10px] opacity-50">No historical records in current security scope.</td></tr>
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
