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
  Settings2,
  Briefcase
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, where, serverTimestamp, doc } from "firebase/firestore";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export function TaskManagement() {
  const { profile: currentUser } = useAuthStore();
  const db = useFirestore();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // --- Task Fetching Logic Based on Provided Matrix ---
  const tasksRef = useMemoFirebase(() => {
    let q = query(collection(db, "tasks"));
    
    if (!currentUser) return q;

    switch (currentUser.role) {
      case 'Super Admin':
        break;
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

  const usersRef = useMemoFirebase(() => query(collection(db, "users")), [db]);
  const { data: allUsers } = useCollection(usersRef);

  // --- Strict Assignment Subordinates Matrix ---
  const subordinates = allUsers?.filter(u => {
    if (!currentUser) return false;
    if (u.id === currentUser.id) return false;

    switch (currentUser.role) {
      case 'Super Admin':
        return true;
      case 'Admin':
        return ['Manager', 'Team Lead', 'Employee'].includes(u.role);
      case 'Manager':
        return (u.role === 'Team Lead' || u.role === 'Employee') && u.department === currentUser.department;
      case 'Team Lead':
        return u.role === 'Employee' && u.department === currentUser.department;
      default:
        return false;
    }
  }) || [];

  const [newTask, setNewTask] = useState({ title: '', description: '', assignedToId: '', deadline: '' });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const targetUser = allUsers?.find(u => u.id === newTask.assignedToId);
    if (!targetUser) {
      toast({ variant: "destructive", title: "Error", description: "Select a valid assignee." });
      return;
    }

    const taskData = {
      ...newTask,
      status: 'pending',
      assignedById: currentUser.id,
      assignedByRole: currentUser.role,
      assignedByName: currentUser.name,
      assignedToRole: targetUser.role,
      assignedToDepartment: targetUser.department,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    addDocumentNonBlocking(collection(db, "tasks"), taskData);
    setIsCreateModalOpen(false);
    setNewTask({ title: '', description: '', assignedToId: '', deadline: '' });
    toast({ title: "Task Assigned", description: "The task has been successfully dispatched." });
  };

  const handleUpdateStatus = (taskId: string, newStatus: string) => {
    updateDocumentNonBlocking(doc(db, "tasks", taskId), { 
      status: newStatus,
      updatedAt: serverTimestamp() 
    });
    toast({ title: "Status Updated", description: `Task marked as ${newStatus}.` });
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 bg-white">
              <Filter className="w-3 h-3 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {currentUser?.role !== 'Employee' && (
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-primary">
            <Plus className="mr-2 h-4 w-4" />
            Assign New Task
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tasks.length === 0 ? (
            <div className="col-span-2 py-20 text-center text-muted-foreground border border-dashed rounded-xl bg-white/50">
              No tasks currently tracked in this view.
            </div>
          ) : tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow bg-white border-none relative group">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <Badge variant="outline" className={getStatusColor(task.status)}>
                    {task.status.toUpperCase()}
                  </Badge>
                  <CardTitle className="text-lg font-bold">{task.title}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'in-progress')}>Mark In Progress</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'completed')}>Mark Completed</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'blocked')}>Mark Blocked</DropdownMenuItem>
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
                    Dept: {task.assignedToDepartment} • By: {task.assignedByName || 'System'}
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
            <DialogTitle>ASSIGN TASK</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label>Task Title</Label>
              <Input required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Assignee</Label>
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
              <Label>Description</Label>
              <Textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Deadline</Label>
              <Input type="date" required value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} />
            </div>
            <Button type="submit" className="w-full h-11 bg-primary">DEPLOY TASK</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}