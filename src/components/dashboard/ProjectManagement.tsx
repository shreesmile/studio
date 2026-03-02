
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/auth-store";
import { useFirestore, useCollection, useMemoFirebase, useUser, addDocumentNonBlocking } from "@/firebase";
import { collection, query, where, orderBy, serverTimestamp, limit } from "firebase/firestore";
import { Briefcase, Plus, Calendar, Target, Loader2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export function ProjectManagement() {
  const { profile: user } = useAuthStore();
  const { user: authUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ 
    name: '', 
    description: '', 
    startDate: '', 
    endDate: '', 
    priority: 'Medium',
    status: 'Not Started'
  });

  const projectsQuery = useMemoFirebase(() => {
    // CRITICAL: Ensure profile is fully synchronized before initiating query to match security rules
    if (!authUser || !user || !user.role || !user.department || user.id !== authUser.uid) {
      console.log("[ProjectManagement] Waiting for clearance synchronization...");
      return null;
    }
    
    let q = query(collection(db, "projects"));
    
    if (user.role === 'Super Admin' || user.role === 'Admin') {
      return query(q, limit(50));
    }
    
    // Employees strictly filter by assignment to satisfy rules
    if (user.role === 'Employee') {
      return query(q, where("assignedTo", "array-contains", authUser.uid), limit(50));
    }
    
    // Managers and Team Leads filter by department
    return query(q, where("department", "==", user.department), limit(50));
  }, [db, user, authUser]);

  const { data: projects, isLoading } = useCollection(projectsQuery);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !user) return;

    const projectData = {
      ...newProject,
      department: user.department || "General",
      createdBy: authUser.uid,
      assignedTo: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    addDocumentNonBlocking(collection(db, "projects"), projectData);
    setIsModalOpen(false);
    setNewProject({ name: '', description: '', startDate: '', endDate: '', priority: 'Medium', status: 'Not Started' });
    toast({ title: "Project Created", description: "Strategic workspace deliverables initialized." });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-primary uppercase tracking-tighter">Project Portfolio</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Strategic Portfolio Assets</p>
        </div>
        {['Super Admin', 'Admin', 'Manager'].includes(user?.role || '') && (
          <Button onClick={() => setIsModalOpen(true)} className="bg-primary shadow-lg hover:shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-20 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-primary/20 w-10 h-10" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Accessing clearance layer...</p>
          </div>
        ) : projects?.map((project) => (
          <Card key={project.id} className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden bg-white">
            <div className={`h-1.5 w-full ${getPriorityColor(project.priority).split(' ')[0]}`} />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className={`text-[8px] font-black uppercase tracking-widest ${getPriorityColor(project.priority)}`}>
                  {project.priority}
                </Badge>
                <Badge className="text-[8px] font-black uppercase tracking-widest bg-muted text-muted-foreground">
                  {project.status}
                </Badge>
              </div>
              <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{project.name}</CardTitle>
              <CardDescription className="line-clamp-2 text-xs min-h-[32px]">{project.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-1">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" /> Start
                  </p>
                  <p className="text-xs font-bold">{project.startDate || 'TBD'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    <Target className="w-2.5 h-2.5" /> Deadline
                  </p>
                  <p className="text-xs font-bold">{project.endDate || 'TBD'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                 <div className="flex items-center gap-2">
                   <Users className="w-3.5 h-3.5 text-muted-foreground" />
                   <span className="text-[9px] font-bold text-muted-foreground uppercase">{project.assignedTo?.length || 0} Members</span>
                 </div>
                 <Badge variant="secondary" className="text-[9px] font-bold uppercase">{project.department}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!projects || projects.length === 0) && !isLoading && (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-[2rem] bg-white/50">
            <Briefcase className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No strategic assets available in current clearance level.</p>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tighter text-xl">Initialize Strategic Project</DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-widest font-bold opacity-70">
              Define a new organizational deliverable and workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Project Identity</Label>
              <Input required value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} placeholder="e.g., Enterprise Portal Migration" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Operational Summary</Label>
              <Textarea required value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} placeholder="Define workspace scope..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Start Date</Label>
                <Input type="date" value={newProject.startDate} onChange={e => setNewProject({...newProject, startDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Target Deadline</Label>
                <Input type="date" value={newProject.endDate} onChange={e => setNewProject({...newProject, endDate: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Priority Layer</Label>
                <Select value={newProject.priority} onValueChange={v => setNewProject({...newProject, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Initial Status</Label>
                <Select value={newProject.status} onValueChange={v => setNewProject({...newProject, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full h-11 bg-primary font-bold uppercase tracking-widest text-xs">Deploy Workspace</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
