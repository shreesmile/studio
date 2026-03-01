
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
  Clock, 
  AlertCircle, 
  MoreVertical, 
  Plus,
  Calendar,
  Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-store";

const mockTasks = [
  { id: '1', title: 'Security Audit', description: 'Complete annual system security review.', status: 'blocked', priority: 'high', deadline: '2024-06-15', assignedTo: 'Charlie' },
  { id: '2', title: 'Feature: AI Insights', description: 'Integrate Genkit flow for analytics.', status: 'in-progress', priority: 'medium', deadline: '2024-06-20', assignedTo: 'Diana' },
  { id: '3', title: 'Onboard New Interns', description: 'Set up development environments.', status: 'pending', priority: 'low', deadline: '2024-06-25', assignedTo: 'Bob' },
  { id: '4', title: 'Database Migration', description: 'Migrate legacy data to new schema.', status: 'completed', priority: 'high', deadline: '2024-06-10', assignedTo: 'Alice' },
];

export function TaskManagement() {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState("all");

  const canCreate = user?.role !== 'Employee';

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
            <SelectTrigger className="w-40">
              <Filter className="w-3 h-3 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canCreate && (
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {mockTasks.map((task) => (
          <Card key={task.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getStatusColor(task.status)}>
                    {task.status.toUpperCase()}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {task.priority.toUpperCase()}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{task.title}</CardTitle>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {task.description}
              </p>
              <div className="flex items-center justify-between text-xs pt-4 border-t">
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {task.deadline}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Assigned: {task.assignedTo}
                  </span>
                </div>
                {user?.role === 'Employee' && (
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Update Progress
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
