"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";
import { useFirestore, useCollection, useMemoFirebase, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, where, doc, orderBy, serverTimestamp } from "firebase/firestore";
import { CalendarDays, Plus, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
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
    if (!authUser || !user) return null;
    
    let q = query(collection(db, "leave_requests"));
    
    // CRITICAL: Employee MUST filter by their own UID to avoid permission error
    if (user.role === 'Employee') {
      q = query(q, where("userId", "==", authUser.uid));
    } else if (['Team Lead', 'Manager'].includes(user.role)) {
      q = query(q, where("department", "==", user.department));
    }
    
    return query(q, orderBy("startDate", "desc"));
  }, [db, user, authUser]);

  const { data: requests, isLoading } = useCollection(leaveQuery);

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    const requestData = {
      userId: authUser.uid,
      userName: user?.name || authUser.email || "Employee",
      department: user?.department || "Default",
      ...newRequest,
      status: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    addDocumentNonBlocking(collection(db, "leave_requests"), requestData);
    setIsRequestModalOpen(false);
    setNewRequest({ startDate: '', endDate: '', reason: '' });
    toast({ title: "Request Submitted", description: "Your leave application is pending approval." });
  };

  const handleAction = (requestId: string, status: 'Approved' | 'Rejected') => {
    updateDocumentNonBlocking(doc(db, "leave_requests", requestId), {
      status,
      approvedBy: user?.name || "Administrator",
      updatedAt: serverTimestamp()
    });
    toast({ title: `Application ${status}`, description: "The status has been updated successfully." });
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
        <h2 className="text-xl font-black text-primary uppercase tracking-tighter">Absence Management</h2>
        <Button onClick={() => setIsRequestModalOpen(true)} className="bg-primary h-10">
          <Plus className="mr-2 h-4 w-4" />
          Request Leave
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
                      <span className="font-bold text-foreground">{req.userName}</span>
                      <Badge variant="outline" className={`text-[9px] uppercase font-black ${getStatusColor(req.status)}`}>
                        {req.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium">
                        <CalendarDays className="w-3 h-3" /> {req.startDate} to {req.endDate}
                      </span>
                      <span className="font-bold uppercase tracking-widest text-[9px] opacity-60">
                        {req.department} Unit
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground pt-2 italic">"{req.reason}"</p>
                  </div>

                  {user?.role !== 'Employee' && req.status === 'Pending' && (
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleAction(req.id, 'Approved')}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" /> Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleAction(req.id, 'Rejected')}
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                  
                  {req.status !== 'Pending' && (
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Processed By</p>
                      <p className="text-xs font-bold text-primary">{req.approvedBy || 'System'}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
        {(!requests || requests.length === 0) && !isLoading && (
          <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-white/50">
            <Clock className="mx-auto w-10 h-10 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground text-sm uppercase font-bold tracking-widest">No active leave requests found</p>
          </div>
        )}
      </div>

      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-tighter font-black">Leave Application Terminal</DialogTitle>
            <DialogDescription>
              Submit a formal request for organizational leave approval.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Start Date</Label>
                <Input 
                  type="date" 
                  required 
                  value={newRequest.startDate} 
                  onChange={e => setNewRequest({...newRequest, startDate: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">End Date</Label>
                <Input 
                  type="date" 
                  required 
                  value={newRequest.endDate} 
                  onChange={e => setNewRequest({...newRequest, endDate: e.target.value})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Operational Reason</Label>
              <Textarea 
                required 
                placeholder="Brief description of absence requirement..."
                value={newRequest.reason} 
                onChange={e => setNewRequest({...newRequest, reason: e.target.value})} 
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full h-11 bg-primary font-bold uppercase tracking-widest text-xs">
                Submit Authorization Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}