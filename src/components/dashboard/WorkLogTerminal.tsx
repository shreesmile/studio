
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";
import { useFirestore, useCollection, useMemoFirebase, useUser, addDocumentNonBlocking } from "@/firebase";
import { collection, query, where, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { Clock, Plus, History, Calendar, Calculator, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export function WorkLogTerminal() {
  const { profile: user } = useAuthStore();
  const { user: authUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [log, setLog] = useState({ 
    projectId: '', 
    taskId: '', 
    date: format(new Date(), "yyyy-MM-dd"), 
    startTime: '09:00', 
    endTime: '17:00', 
    progressNote: '' 
  });

  const projectsQuery = useMemoFirebase(() => {
    // Wait for organizational sync to satisfy security rules
    if (!authUser || !user || !user.role || user.id !== authUser.uid) return null;
    
    let q = query(collection(db, "projects"));
    
    // STRICT filtering based on role to match security rules
    if (user.role === 'Employee') {
      q = query(q, where("assignedTo", "array-contains", authUser.uid));
    } else if (user.role !== 'Super Admin' && user.role !== 'Admin') {
      q = query(q, where("department", "==", user.department || "General"));
    }
    return q;
  }, [db, user, authUser]);

  const { data: projects } = useCollection(projectsQuery);

  const logsQuery = useMemoFirebase(() => {
    // Wait for organizational sync to satisfy security rules
    if (!authUser || !user || !user.role || user.id !== authUser.uid) return null;
    
    let q = query(collection(db, "work_logs"));
    
    // Employees see ONLY their own logs
    if (user.role === 'Employee') {
      q = query(q, where("userId", "==", authUser.uid));
    } else if (user.role === 'Super Admin' || user.role === 'Admin') {
      // Global visibility for admins
    } else {
      // Departmental visibility for Managers/TLs
      q = query(q, where("department", "==", user.department || "General"));
    }
    
    return query(q, orderBy("date", "desc"), limit(20));
  }, [db, authUser, user]);

  const { data: logs, isLoading } = useCollection(logsQuery);

  const calculateHours = (start: string, end: string) => {
    const s = start.split(':').map(Number);
    const e = end.split(':').map(Number);
    const startMins = s[0] * 60 + s[1];
    const endMins = e[0] * 60 + e[1];
    return Number(((endMins - startMins) / 60).toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !user) return;

    const totalHours = calculateHours(log.startTime, log.endTime);
    if (totalHours <= 0) {
      toast({ variant: "destructive", title: "Invalid Timeline", description: "End time must be after start time." });
      return;
    }

    const logData = {
      ...log,
      totalHours,
      userId: authUser.uid,
      userName: user.name,
      department: user.department || "General",
      createdAt: serverTimestamp()
    };

    addDocumentNonBlocking(collection(db, "work_logs"), logData);
    setIsModalOpen(false);
    toast({ title: "Work Log Synchronized", description: `Captured ${totalHours} production hours.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-primary uppercase tracking-tighter">Time Management</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Production Cycle Monitoring</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-accent shadow-lg hover:shadow-accent/20">
          <Plus className="mr-2 h-4 w-4" />
          Log Daily Effort
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-1 border-primary/10 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              Cycle Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Hours (Recent)</p>
              <h3 className="text-4xl font-black text-primary font-mono">
                {logs?.reduce((acc, l) => acc + (l.totalHours || 0), 0).toFixed(1) || "0.0"}
              </h3>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm border border-primary/10 space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="text-muted-foreground">Efficiency Index</span>
                <span className="text-accent">A+</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full w-[85%] bg-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-none bg-white shadow-sm">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Chronological Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary/20" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-muted/50 uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Project Workspace</th>
                      <th className="px-6 py-4">Timeline</th>
                      <th className="px-6 py-4">Total Effort</th>
                      <th className="px-6 py-4">Progress Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/50">
                    {logs?.map((l) => (
                      <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-bold text-muted-foreground whitespace-nowrap">{l.date}</td>
                        <td className="px-6 py-4 font-black text-primary uppercase">
                          {projects?.find(p => p.id === l.projectId)?.name || "General Workspace"}
                        </td>
                        <td className="px-6 py-4 font-mono">{l.startTime} - {l.endTime}</td>
                        <td className="px-6 py-4 font-black">
                          <Badge variant="secondary" className="text-[10px] font-mono">{l.totalHours} hrs</Badge>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground italic line-clamp-1 max-w-[300px]" title={l.progressNote}>
                          {l.progressNote}
                        </td>
                      </tr>
                    ))}
                    {(!logs || logs.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-20 text-center uppercase font-bold text-muted-foreground/30 tracking-widest italic">
                          No production history captured in current security scope.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tighter text-xl">Work Log Interface</DialogTitle>
            <DialogDescription>
              Capture daily production metrics and effort synchronization.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Active Project</Label>
              <Select value={log.projectId} onValueChange={v => setLog({...log, projectId: v})}>
                <SelectTrigger><SelectValue placeholder="Select target workspace" /></SelectTrigger>
                <SelectContent>
                  {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Date</Label>
                <Input type="date" value={log.date} onChange={e => setLog({...log, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-transparent">.</Label>
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase italic px-2 py-2">
                  <Calendar className="w-3 h-3" /> System Log Date
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Shift Start</Label>
                <Input type="time" value={log.startTime} onChange={e => setLog({...log, startTime: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Shift End</Label>
                <Input type="time" value={log.endTime} onChange={e => setLog({...log, endTime: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Operational Narrative</Label>
              <Textarea required value={log.progressNote} onChange={e => setLog({...log, progressNote: e.target.value})} placeholder="What was achieved during this cycle?" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full h-11 bg-accent font-bold uppercase tracking-widest text-xs">Authorize Effort Synchronization</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
