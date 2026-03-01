"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { PieChart as PieIcon, BarChart3, Download, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";

const COLORS = ['#457399', '#5847CC', '#6366f1', '#a855f7', '#ec4899'];

export function ReportsTab() {
  const { profile: user } = useAuthStore();
  const { user: authUser } = useUser();
  const db = useFirestore();

  const logsQuery = useMemoFirebase(() => {
    if (!authUser || !user) return null;
    let q = query(collection(db, "work_logs"));
    
    if (user.role === 'Super Admin') return query(q, limit(100));
    return query(q, where("department", "==", user.department), limit(100));
  }, [db, user, authUser]);

  const { data: logs, isLoading } = useCollection(logsQuery);

  const chartData = React.useMemo(() => {
    if (!logs) return [];
    const dateMap: Record<string, number> = {};
    logs.forEach(log => {
      dateMap[log.date] = (dateMap[log.date] || 0) + log.totalHours;
    });
    return Object.entries(dateMap)
      .map(([date, hours]) => ({ date, hours }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);
  }, [logs]);

  const deptData = React.useMemo(() => {
    if (!logs) return [];
    const deptMap: Record<string, number> = {};
    logs.forEach(log => {
      const dept = log.department || 'General';
      deptMap[dept] = (deptMap[dept] || 0) + log.totalHours;
    });
    return Object.entries(deptMap).map(([name, value]) => ({ name, value }));
  }, [logs]);

  const exportToCSV = () => {
    if (!logs) return;
    const headers = ["Date", "User", "Department", "Hours", "Note"];
    const rows = logs.map(l => [l.date, l.userName, l.department, l.totalHours, l.progressNote.replace(/,/g, ' ')]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `operational_report_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-primary uppercase tracking-tighter">Strategic Analytics</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Performance Intelligence Layer</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="border-primary/20 text-primary hover:bg-primary/5">
          <Download className="mr-2 h-4 w-4" />
          Export Dataset (CSV)
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Production Timeline (Last 7 Days)
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent className="h-[300px] pt-6">
            {isLoading ? (
              <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-muted" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                  <XAxis dataKey="date" fontSize={9} fontWeight="bold" />
                  <YAxis fontSize={9} fontWeight="bold" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }}
                  />
                  <Bar dataKey="hours" fill="#457399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-accent" />
              Organizational Effort Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] pt-6">
            {isLoading ? (
              <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-muted" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}