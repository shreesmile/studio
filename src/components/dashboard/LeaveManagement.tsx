
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore, ROLE_WEIGHTS } from "@/lib/auth-store";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, query, where, doc, serverTimestamp } from "firebase/firestore";
import { CalendarDays, Plus, Clock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function LeaveManagement() {
  const { profile: user } = useAuthStore();
  const { user: authUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({ startDate: '', endDate: '', reason: '' });

  const leaveQuery = useMemoFirebase(() => {
    if (!authUser || !user || user.id !== authUser.uid || !user.role || !user.department) return null;
    
    let q = collection(db, "leave_requests");
    const userWeight = ROLE_WEIGHTS[user.role] || 0;
    
    // Performance: Remove orderBy to avoid composite index requirement in prototype
    if (userWeight >= 4) {
      return query(q);
    }

    if (userWeight >= 2) {
      return query(q, where("department", "==", user.department));
    }

    return query(q, where("userId", "==", authUser.uid));
  }, [db, user, authUser]);

  const { data: rawRequests, isLoading } = useCollection(leaveQuery);

  // Client-side sorting to resolve "Query requires an index" errors
  const requests = useMemo(() => {
    if (!rawRequests) return [];
    return [...rawRequests].sort((a, b) => {
      const dateA = new Date(a.startDate || 0).getTime();
      const dateB = new Date(b.startDate || 0).getTime();
      return dateB - dateA;
    });
  }, [rawRequests]);

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !user) return;

    const requestData = {
      userId: authUser.uid,
      userName: user.name,
      department: user.department,
      ...newRequest,
      status: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    addDocumentNonBlocking(collection(db, "leave_requests"), requestData);
    setIsRequestModalOpen(false);
    setNewRequest({ startDate: '', endDate: '', reason: '' });
    toast({ title: "Authorization Requested", description: "Leave application synchronized for processing." });
  };

  const handleAction = (requestId: string, status: 'Approved' | 'Rejected') => {
    updateDocumentNonBlocking(doc(db, "leave_requests", requestId), {
      status,
      approvedBy: user?.name || "System Admin",
      updatedAt: serverTimestamp()
    });
    toast({ title: `Identity ${status}`, description: "Organizational status updated." });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-primary uppercase tracking-tighter">Absence Clearance</h2>
        <Button onClick={() => setIsRequestModalOpen(true)} className="bg-primary h-10 shadow-lg">
          <Plus className="mr-2 h-4 w-4" /> Initialize Request
        </Button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary/20" /></div>
        ) : (
          requests?.map((req) => (
            <Card key={req.id} className="border-none shadow-sm bg-white overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{req.userName}</span>
                      <Badge variant="outline" className={`text-[8px] uppercase font-black tracking-widest ${getStatusColor(req.status)}`}>
                        {req.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-bold">
                        <CalendarDays className="w-3 h-3" /> {req.startDate} — {req.endDate}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2 italic line-clamp-2">"{req.reason}"</p>
                  </div>

                  {ROLE_WEIGHTS[user?.role || 'Employee'] >= 3 && req.status === 'Pending' && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(req.id, 'Approved')}>
                        Authorize
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleAction(req.id, 'Rejected')}>
                        Deny
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
        {(!requests || requests.length === 0) && !isLoading && (
          <div className="p-20 text-center border-2 border-dashed rounded-[2rem] bg-white/50">
            <Clock className="mx-auto w-10 h-10 text-muted-foreground/10 mb-4" />
            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">No active absence clearance requests</p>
          </div>
        )}
      </div>

      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-tighter font-black text-xl">Request Absence Clearance</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Synchronize absence periods with organizational planning.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Start Date</Label>
                <Input type="date" required value={newRequest.startDate} onChange={e => setNewRequest({...newRequest, startDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">End Date</Label>
                <Input type="date" required value={newRequest.endDate} onChange={e => setNewRequest({...newRequest, endDate: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Operational Narrative</Label>
              <Textarea required placeholder="Specify reason for requested absence..." value={newRequest.reason} onChange={e => setNewRequest({...newRequest, reason: e.target.value})} />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full h-11 bg-primary font-bold uppercase tracking-widest text-xs">Authorize Submission</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
