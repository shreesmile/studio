
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Search, UserPlus, Eye, Edit, Trash2, Loader2, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useUser
} from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore, UserRole } from "@/lib/auth-store";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  password: string;
  status: 'Active' | 'Pending' | 'Blocked';
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  'Super Admin': 5,
  'Admin': 4,
  'Manager': 3,
  'Team Lead': 2,
  'Employee': 1
};

export function UserManagement() {
  const db = useFirestore();
  const { toast } = useToast();
  const { profile: currentUser } = useAuthStore();
  const { user: authUser } = useUser();
  const [search, setSearch] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const currentRolePower = useMemo(() => ROLE_HIERARCHY[currentUser?.role || 'Employee'], [currentUser?.role]);

  const usersQuery = useMemoFirebase(() => {
    if (!currentUser || !authUser || currentUser.id !== authUser.uid) {
      console.log("[UserMgmt] Identity not synchronized. Skipping user list fetch.");
      return null;
    }
    
    console.log(`[UserMgmt] Fetching directory for role: ${currentUser.role}`);
    // Super Admin & Admin can see all
    if (currentRolePower >= 4) {
      return collection(db, "users");
    }
    
    // Managers and TLs see department or subordinates
    if (currentRolePower >= 2) {
      return query(
        collection(db, "users"),
        where("department", "==", currentUser.department)
      );
    }
    
    return null;
  }, [db, currentUser, authUser, currentRolePower]);

  const { data: users, isLoading } = useCollection<UserData>(usersQuery);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [formData, setFormData] = useState<UserData>({
    id: '', name: '', email: '', role: 'Employee', department: currentUser?.department || 'General', password: '', status: 'Active'
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const term = search.toLowerCase().trim();
    return users.filter(u => {
      const targetPower = ROLE_HIERARCHY[u.role] || 0;
      // Cannot see those higher in hierarchy (except self)
      const isVisible = currentUser?.role === 'Super Admin' || currentRolePower > targetPower || u.id === currentUser?.id;
      if (!isVisible) return false;
      if (!term) return true;
      return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
    });
  }, [users, search, currentRolePower, currentUser?.role, currentUser?.id]);

  const handleOpenModal = useCallback((mode: 'add' | 'edit' | 'view', user?: UserData) => {
    setModalMode(mode);
    if (user) {
      setFormData(user);
    } else {
      setFormData({ 
        id: '', 
        name: '', 
        email: '', 
        role: 'Employee', 
        department: currentUser?.department || 'General', 
        password: '', 
        status: 'Active' 
      });
    }
    setIsModalOpen(true);
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view' || isSubmitting) return;
    
    setIsSubmitting(true);
    console.log(`[UserMgmt] Committing ${modalMode} action for ${formData.email}`);
    
    try {
      if (modalMode === 'add') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password || 'password123', name: formData.name, role: formData.role })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);

        console.log(`[UserMgmt] Auth identity created for UID: ${result.uid}. Syncing Firestore...`);
        const userData = { ...formData, id: result.uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        setDocumentNonBlocking(doc(db, "users", result.uid), userData, { merge: true });
        toast({ title: "User Deployed", description: "Strategic identity initialized." });
      } else {
        updateDocumentNonBlocking(doc(db, "users", formData.id), { ...formData, updatedAt: new Date().toISOString() });
        toast({ title: "Profile Updated", description: "Organizational changes committed." });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("[UserMgmt] Action failed:", err);
      toast({ variant: "destructive", title: "Action Failed", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search directory..." className="pl-9 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="icon" className="bg-white" onClick={() => setShowPasswords(!showPasswords)}>
            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {currentRolePower >= 2 && (
          <Button onClick={() => handleOpenModal('add')} className="bg-primary">
            <UserPlus className="mr-2 h-4 w-4" /> Add Personnel
          </Button>
        )}
      </div>

      <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="font-bold uppercase tracking-widest text-[10px]">Identity</TableHead>
              <TableHead className="font-bold uppercase tracking-widest text-[10px]">Clearance</TableHead>
              <TableHead className="font-bold uppercase tracking-widest text-[10px]">Unit</TableHead>
              <TableHead className="font-bold uppercase tracking-widest text-[10px]">Email</TableHead>
              {showPasswords && <TableHead className="font-bold uppercase tracking-widest text-[10px]">Passkey</TableHead>}
              <TableHead className="text-right font-bold uppercase tracking-widest text-[10px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin inline-block opacity-20" /></TableCell></TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground uppercase text-[10px] font-bold tracking-widest">No authorized directory entries found.</TableCell></TableRow>
            ) : (
              filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-xs">{u.name}</TableCell>
                  <TableCell><Badge variant={u.role === 'Super Admin' ? 'destructive' : 'secondary'} className="text-[9px] uppercase font-black">{u.role}</Badge></TableCell>
                  <TableCell className="text-xs">{u.department}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{u.email}</TableCell>
                  {showPasswords && <TableCell className="font-mono text-[10px]">{u.password}</TableCell>}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenModal('view', u)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
                        {currentRolePower > ROLE_HIERARCHY[u.role] && (
                          <DropdownMenuItem onClick={() => handleOpenModal('edit', u)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        )}
                        {currentRolePower >= 4 && currentUser?.id !== u.id && (
                          <DropdownMenuItem className="text-destructive" onClick={() => { setUserToDelete(u.id); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tighter">{modalMode.toUpperCase()} IDENTITY</DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest">Organizational profile management terminal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Full Name</Label>
              <Input disabled={modalMode === 'view'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="h-9 text-xs" />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Email Address</Label>
              <Input disabled={modalMode !== 'add'} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="h-9 text-xs" />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Administrative Password</Label>
              <Input disabled={modalMode === 'view'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required className="h-9 text-xs" />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Assigned Clearance</Label>
              <Select disabled={modalMode === 'view'} value={formData.role} onValueChange={(val: UserRole) => setFormData({ ...formData, role: val })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(ROLE_HIERARCHY).map(r => (
                    <SelectItem key={r} value={r} disabled={ROLE_HIERARCHY[r as UserRole] >= currentRolePower && currentUser?.role !== 'Super Admin'}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">Department Unit</Label>
              <Input disabled={modalMode === 'view' || currentRolePower < 3} value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} required className="h-9 text-xs" />
            </div>
            <DialogFooter>
              {modalMode !== 'view' && (
                <Button type="submit" className="w-full h-11 bg-primary font-bold uppercase tracking-widest text-xs" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Commit Profile'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black uppercase tracking-tighter">Terminate Identity</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">Purge this account from the strategic directory. This action is irreversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="uppercase text-[10px] font-black">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if(userToDelete) deleteDocumentNonBlocking(doc(db, "users", userToDelete)); setIsDeleteDialogOpen(false); }} className="bg-destructive uppercase text-[10px] font-black">Confirm Purge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
