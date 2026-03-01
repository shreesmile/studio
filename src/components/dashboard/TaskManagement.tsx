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
  CheckCircle2, 
  Plus,
  Calendar,
  Filter,
  User,
  MoreVertical,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase";
import { collection, query, where, serverTimestamp } from "firebase/firestore";
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

export function TaskManagement() {
  const { profile: currentUser } = useAuthStore();
  const db = useFirestore();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Task Fetching Logic
  const tasksRef = useMemoFirebase(() => {
    let q = query(collection(db, "tasks"));
    if (currentUser?.role === 'Employee') {
      q = query(q, where("assignedToId", "==", currentUser.id));
    }
    return q;
  }, [db, currentUser]);
  
  const { data: tasks, isLoading } = useCollection(tasksRef);

  // Subordinates for Assignment
  const reportsRef = useMemoFirebase(() => query(collection(db, "users")), [db]);
  const { data: allUsers } = useCollection(reportsRef);

  const subordinates = allUsers?.filter(u => {
    if (currentUser?.role === 'Super Admin') return true;
    if (currentUser?.role === 'Admin') return u.role !== 'Super Admin';
    if (currentUser?.role === 'Manager') return u.role === 'Team Lead' || u.role === 'Employee';
    if (currentUser?.role === 'Team Lead') return u.role === 'Employee';
    return false;
  }) || [];

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedToId: '',
    deadline: ''
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const taskData = {
      ...newTask,
      status: 'pending',
      assignedById: currentUser.id,
      assignedByName: currentUser.name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    addDocumentNonBlocking(collection(db, "tasks"), taskData);
    setIsCreateModalOpen(false);
    toast({ title: "Task Assigned", description: "The task has been successfully dispatched." });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'blocked': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const canCreate = currentUser?.role !== 'Employee';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <Filter className="w-3 h-3 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canCreate && (
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
          {tasks?.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <Badge variant="outline" className={getStatusColor(task.status)}>
                    {task.status.toUpperCase()}
                  </Badge>
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                </div>
                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{task.description}</p>
                <div className="flex items-center justify-between text-xs pt-4 border-t">
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{task.deadline}</span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{allUsers?.find(u => u.id === task.assignedToId)?.name || 'Unknown'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>NEW TASK ASSIGNMENT</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="grid gap-2">
              <Label>Task Title</Label>
              <Input required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Assign To Subordinate</Label>
              <Select required value={newTask.assignedToId} onValueChange={val => setNewTask({...newTask, assignedToId: val})}>
                <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                <SelectContent>
                  {subordinates.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Deadline</Label>
              <Input type="date" required value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} />
            </div>
            <DialogFooter><Button type="submit">Deploy Task</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}