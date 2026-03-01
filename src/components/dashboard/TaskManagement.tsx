"use client";

import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Plus,
  Calendar,
  Filter,
  User,
  Loader2,
  Settings2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore, UserRole } from "@/lib/auth-store";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, where, serverTimestamp, doc } from "firebase/firestore";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

const ROLE_POWER: Record<UserRole, number> = {
  'Super Admin': 4,
  'Admin': 3,
  'Manager': 2,
  'Team Lead': 1,
  'Employee': 0
};

export function TaskManagement() {
  const { profile: currentUser } = useAuthStore();
  const db = useFirestore();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const tasksRef = useMemoFirebase(() => {
    let q = query(collection(db, "tasks"));
    if (!currentUser) return q;

    switch (currentUser.role) {
      case 'Super Admin': break;
      case 'Admin':
        q = query(q, where("assignedByRole", "!=", "Super Admin"));
        break;
      case 'Manager':
      case 'Team Lead':
        q = query(q, where("assignedToDepartment", "==", currentUser.department));
        break;
      case 'Employee':
        q = query(q, where("assignedToId", "==", currentUser.id));
        break;
    }
    return q;
  }, [db, currentUser]);
  
  const { data: allTasks, isLoading } = useCollection(tasksRef);
  const tasks = allTasks?.filter(t => filterStatus === 'all' || t.status === filterStatus) || [];

  const usersRef = useMemoFirebase(() => collection(db, "users"), [db]);
  const { data: allUsers } = useCollection(usersRef);

  const subordinates = allUsers?.filter(u => {
    if (!currentUser || u.id === currentUser.id) return false;
    const myPower = ROLE_POWER[currentUser.role];
    const targetPower = ROLE_POWER[u.role];

    // Assignment matrix logic
    if (currentUser.role === 'Super Admin') return true;
    if (currentUser.role === 'Admin') return targetPower < 3;
    if (currentUser.role === 'Manager') return targetPower < 2 && u.department === currentUser.department;
    if (currentUser.role === 'Team Lead') return targetPower === 0 && u.department === currentUser.department;
    return false;
  }) || [];

  const [newTask, setNewTask] = useState({ title: '', description: '', assignedToId: '', deadline: '' });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const target = allUsers?.find(u => u.id === newTask.assignedToId);
    if (!target || !currentUser) return;

    const taskData = {
      ...newTask,
      status: 'pending',
      assignedById: currentUser.id,
      assignedByRole: currentUser.role,
      assignedByName: currentUser.name,
      assignedToRole: target.role,
      assignedToDepartment: target.department,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    addDocumentNonBlocking(collection(db, "tasks"), taskData);
    setIsCreateModalOpen(false);
    setNewTask({ title: '', description: '', assignedToId: '', deadline: '' });
    toast({ title: "Task Deployed", description: "Workflow synchronized." });
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
        {currentUser?.role !== 'Employee' && (
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-primary">
            <Plus className="mr-2 h-4 w-4" />
            Assign Workspace Task
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary/40" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tasks.length === 0 ? (
            <div className="col-span-2 py-20 text-center text-muted-foreground border border-dashed rounded-xl bg-white/50">
              No tasks matched the current clearance level.
            </div>
          ) : tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow bg-white border-none">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <Badge variant="outline" className={getStatusColor(task.status)}>
                    {task.status.toUpperCase()}
                  </Badge>
                  <CardTitle className="text-lg font-bold">{task.title}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Settings2 className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => updateDocumentNonBlocking(doc(db, "tasks", task.id), { status: 'in-progress' })}>In Progress</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateDocumentNonBlocking(doc(db, "tasks", task.id), { status: 'completed' })}>Completed</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateDocumentNonBlocking(doc(db, "tasks", task.id), { status: 'blocked' })}>Blocked</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{task.description}</p>
                <div className="flex flex-col gap-2 pt-4 border-t">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {task.deadline}</span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {allUsers?.find(u => u.id === task.assignedToId)?.name || 'N/A'}</span>
                  </div>
                  <div className="text-[9px] uppercase font-medium text-primary/60">
                    Dept: {task.assignedToDepartment} • By: {task.assignedByName} ({task.assignedByRole})
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>DEPLOY WORKFLOW TASK</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label>Task Title</Label>
              <Input required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Designated Assignee</Label>
              <Select required value={newTask.assignedToId} onValueChange={val => setNewTask({...newTask, assignedToId: val})}>
                <SelectTrigger><SelectValue placeholder="Select subordinate" /></SelectTrigger>
                <SelectContent>
                  {subordinates.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Operational Details</Label>
              <Textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Target Deadline</Label>
              <Input type="date" required value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} />
            </div>
            <Button type="submit" className="w-full h-11 bg-primary">INITIALIZE WORKFLOW</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
