
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Filter, User, Loader2, Settings2, ClipboardList, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore, UserRole } from "@/lib/auth-store";
import { useFirestore, useCollection, useMemoFirebase, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, where, serverTimestamp, doc, or, limit } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const ROLE_POWER: Record<UserRole, number> = {
  'Super Admin': 5,
  'Admin': 4,
  'Manager': 3,
  'Team Lead': 2,
  'Employee': 1
};

export const TaskManagement = React.memo(() => {
  const { profile: currentUser } = useAuthStore();
  const { user: authUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubTaskModalOpen, setIsSubTaskModalOpen] = useState(false);
  const [selectedTaskForSub, setSelectedTaskForSub] = useState<string | null>(null);

  const currentPower = currentUser ? ROLE_POWER[currentUser.role] : 0;

  const tasksRef = useMemoFirebase(() => {
    if (!currentUser || !currentUser.role || !authUser || currentUser.id !== authUser.uid) return null;
    let q = collection(db, "tasks");
    
    if (currentUser.role === 'Employee') return query(q, where("assignedTo", "==", authUser.uid), limit(50));
    if (currentUser.role === 'Super Admin' || currentUser.role === 'Admin') return query(q, limit(50));
    
    return query(q, where("assignedToDepartment", "==", currentUser.department), limit(50));
  }, [db, currentUser, authUser]);
  
  const { data: allTasks, isLoading } = useCollection(tasksRef);
  const tasks = allTasks?.filter(t => filterStatus === 'all' || t.status === filterStatus) || [];

  const projectsRef = useMemoFirebase(() => {
    if (!currentUser || !currentUser.role || !authUser || currentUser.id !== authUser.uid) return null;
    let q = collection(db, "projects");
    
    if (currentUser.role === 'Super Admin' || currentUser.role === 'Admin') {
      return query(q, limit(50));
    }
    
    const filters = [
      where("assignedUsers", "array-contains", authUser.uid),
      where("createdBy", "==", authUser.uid)
    ];

    if (currentUser.role === 'Manager' || currentUser.role === 'Team Lead') {
      filters.push(where("department", "==", currentUser.department));
    }
    
    return query(q, or(...filters), limit(50));
  }, [db, currentUser, authUser]);
  
  const { data: projects } = useCollection(projectsRef);

  const usersRef = useMemoFirebase(() => {
    if (!currentUser || !currentUser.role || currentPower < 2) return null;
    
    let q = collection(db, "users");
    if (currentUser.role === 'Super Admin' || currentUser.role === 'Admin') {
      return query(q, limit(100));
    }
    
    return query(q, where("department", "==", currentUser.department), limit(100));
  }, [db, currentUser, currentPower]);
  
  const { data: allUsers } = useCollection(usersRef);

  const subTasksRef = useMemoFirebase(() => {
    if (!authUser) return null;
    return query(collection(db, "sub_tasks"), limit(100));
  }, [db, authUser]);
  
  const { data: allSubTasks } = useCollection(subTasksRef);

  const subordinates = allUsers?.filter(u => {
    if (!currentUser || u.id === currentUser.id) return false;
    const targetPower = ROLE_POWER[u.role] || 0;
    return currentPower > targetPower;
  }) || [];

  const [newTask, setNewTask] = useState({ projectId: '', title: '', description: '', assignedTo: '', dueDate: '', estimatedHours: 0 });
  const [newSubTask, setNewSubTask] = useState({ title: '', description: '', priority: 'Medium' });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !authUser) return;
    const target = allUsers?.find(u => u.id === newTask.assignedTo);

    const taskData = {
      ...newTask,
      status: 'pending',
      createdBy: currentUser.id,
      assignedToDepartment: target?.department || currentUser.department,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    addDocumentNonBlocking(collection(db, "tasks"), taskData);
    setIsCreateModalOpen(false);
    setNewTask({ projectId: '', title: '', description: '', assignedTo: '', dueDate: '', estimatedHours: 0 });
    toast({ title: "Task Deployed", description: "Main workflow unit initialized." });
  };

  const handleCreateSubTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedTaskForSub) return;

    const subTaskData = {
      ...newSubTask,
      taskId: selectedTaskForSub,
      status: 'pending',
      createdBy: currentUser.id,
      createdAt: serverTimestamp()
    };

    addDocumentNonBlocking(collection(db, "sub_tasks"), subTaskData);
    setIsSubTaskModalOpen(false);
    setNewSubTask({ title: '', description: '', priority: 'Medium' });
    toast({ title: "Sub-task Captured", description: "Granular effort unit added to workflow." });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'blocked': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-white">
            <Filter className="w-3 h-3 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Operations</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        {currentPower >= 3 && (
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-primary">
            <Plus className="mr-2 h-4 w-4" />
            Initialize Main Task
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-primary/20 w-10 h-10" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic animate-pulse">Syncing Workflows...</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-all bg-white border-none group overflow-hidden">
              <div className={`h-1 w-full ${getStatusColor(task.status).split(' ')[0]}`} />
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[9px] uppercase font-black ${getStatusColor(task.status)}`}>
                      {task.status}
                    </Badge>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                      {projects?.find(p => p.id === task.projectId)?.name}
                    </span>
                  </div>
                  <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{task.title}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Settings2 className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {currentPower >= 2 && (
                      <DropdownMenuItem onClick={() => { setSelectedTaskForSub(task.id); setIsSubTaskModalOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Sub-task
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => updateDocumentNonBlocking(doc(db, "tasks", task.id), { status: 'in-progress' })}>Set In-Progress</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateDocumentNonBlocking(doc(db, "tasks", task.id), { status: 'completed' })}>Set Completed</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground line-clamp-2 italic">"{task.description}"</p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> Sub-tasks Analysis</span>
                    <span>{allSubTasks?.filter(st => st.taskId === task.id && st.status === 'completed').length || 0} / {allSubTasks?.filter(st => st.taskId === task.id).length || 0}</span>
                  </div>
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500" 
                      style={{ width: `${(allSubTasks?.filter(st => st.taskId === task.id && st.status === 'completed').length || 0) / (allSubTasks?.filter(st => st.taskId === task.id).length || 1) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-muted/50">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-bold uppercase">{allUsers?.find(u => u.id === task.assignedTo)?.name || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-bold text-muted-foreground">{task.dueDate}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {tasks.length === 0 && (
            <div className="col-span-2 py-20 text-center border-2 border-dashed rounded-2xl bg-white/50 space-y-2">
              <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/20" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No strategic tasks in current clearance level.</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tighter">Initialize Operational Task</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Primary workflow deployment unit</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Target Project</Label>
              <Select value={newTask.projectId} onValueChange={v => setNewTask({...newTask, projectId: v})}>
                <SelectTrigger><SelectValue placeholder="Select workspace" /></SelectTrigger>
                <SelectContent>
                  {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Task Title</Label>
              <Input required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Assigned Personnel</Label>
              <Select value={newTask.assignedTo} onValueChange={v => setNewTask({...newTask, assignedTo: v})}>
                <SelectTrigger><SelectValue placeholder="Select subordinate" /></SelectTrigger>
                <SelectContent>
                  {subordinates.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Target Deadline</Label>
                <Input type="date" required value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest">Est. Hours</Label>
                <Input type="number" value={newTask.estimatedHours} onChange={e => setNewTask({...newTask, estimatedHours: Number(e.target.value)})} />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full h-11 bg-primary font-bold uppercase tracking-widest text-xs">Authorize Task Deployment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubTaskModalOpen} onOpenChange={setIsSubTaskModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tighter">Capture Sub-Task Unit</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Granular effort decomposition</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubTask} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Unit Title</Label>
              <Input required value={newSubTask.title} onChange={e => setNewSubTask({...newSubTask, title: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Priority Layer</Label>
              <Select value={newSubTask.priority} onValueChange={v => setNewSubTask({...newSubTask, priority: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full h-11 bg-accent font-bold uppercase tracking-widest text-xs">Synchronize Sub-task Effort</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
});

TaskManagement.displayName = "TaskManagement";
