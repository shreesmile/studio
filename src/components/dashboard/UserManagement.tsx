
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
import { collection, doc, serverTimestamp } from "firebase/firestore";
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
  createdAt?: any;
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
  
  const currentRolePower = useMemo(() => 
    ROLE_HIERARCHY[currentUser?.role || 'Employee'], 
  [currentUser?.role]);

  const isAdminUser = useMemo(() => 
    currentRolePower >= 4,
  [currentRolePower]);

  const usersRef = useMemoFirebase(() => {
    // CRITICAL: Ensure sync before query
    if (!currentUser || !currentUser.role || !authUser || currentUser.id !== authUser.uid) return null;
    if (currentRolePower < 2) return null;
    return collection(db, "users");
  }, [db, currentUser, authUser, currentRolePower]);

  const { data: users, isLoading } = useCollection<UserData>(usersRef);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedUser, setSelectedUser] = useState<Partial<UserData> | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<UserData>({
    id: '',
    name: '',
    email: '',
    role: 'Employee',
    department: 'General',
    password: '',
    status: 'Active'
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const term = search.toLowerCase().trim();
    return users.filter(u => {
      const targetPower = ROLE_HIERARCHY[u.role] || 0;
      const isVisible = currentUser?.role === 'Super Admin' || currentRolePower > targetPower || u.id === currentUser?.id;

      if (!isVisible) return false;
      if (!term) return true;
      
      return (u.name || "").toLowerCase().includes(term) || 
             (u.role || "").toLowerCase().includes(term) || 
             (u.email || "").toLowerCase().includes(term);
    });
  }, [users, search, currentRolePower, currentUser?.role, currentUser?.id]);

  const canManageAction = useCallback((targetRole: UserRole, targetId: string) => {
    if (!currentUser) return false;
    if (currentUser.id === targetId) return true;
    return currentRolePower > ROLE_HIERARCHY[targetRole];
  }, [currentUser, currentRolePower]);

  const handleOpenModal = useCallback((mode: 'add' | 'edit' | 'view', user?: UserData) => {
    setModalMode(mode);
    if (user) {
      setFormData({
        id: user.id || '',
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'Employee',
        department: user.department || 'General',
        password: user.password || '',
        status: user.status || 'Active'
      });
      setSelectedUser(user);
    } else {
      setFormData({ id: '', name: '', email: '', role: 'Employee', department: 'General', password: '', status: 'Active' });
      setSelectedUser(null);
    }
    setIsModalOpen(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view' || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      if (modalMode === 'add') {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password || 'password123',
            name: formData.name,
            role: formData.role
          })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to create account.");

        const newUid = result.uid;
        const userData = { 
          id: newUid,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department || 'General',
          password: formData.password || 'password123',
          status: 'Active' as const,
          createdAt: new Date().toISOString(), 
          updatedAt: new Date().toISOString() 
        };
        
        setDocumentNonBlocking(doc(db, "users", newUid), userData, { merge: true });
        
        const rolePath = `user_roles_${userData.role.replace(/\s+/g, '_')}`;
        setDocumentNonBlocking(doc(db, rolePath, newUid), { active: true }, { merge: true });

        toast({ title: "User Created", description: "Identity and profile have been deployed." });
      } else if (modalMode === 'edit' && selectedUser?.id) {
        const updateData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          password: formData.password,
          updatedAt: new Date().toISOString()
        };
        
        if (selectedUser.role !== updateData.role) {
          const oldPath = `user_roles_${selectedUser.role?.replace(/\s+/g, '_')}`;
          const newPath = `user_roles_${updateData.role.replace(/\s+/g, '_')}`;
          deleteDocumentNonBlocking(doc(db, oldPath, selectedUser.id));
          setDocumentNonBlocking(doc(db, newPath, selectedUser.id), { active: true }, { merge: true });
        }

        updateDocumentNonBlocking(doc(db, "users", selectedUser.id), updateData);
        toast({ title: "Profile Updated", description: "Changes synchronized." });
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deployment Failed",
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = () => {
    if (!userToDelete) return;
    const target = filteredUsers.find(u => u.id === userToDelete);
    if (target) {
      const rolePath = `user_roles_${target.role.replace(/\s+/g, '_')}`;
      deleteDocumentNonBlocking(doc(db, rolePath, userToDelete));
      deleteDocumentNonBlocking(doc(db, "users", userToDelete));
      toast({ title: "User Removed", description: "Account purged from directory." });
    }
    setIsDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search directory..." 
              className="pl-9 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            className="shrink-0 bg-white"
            onClick={() => setShowPasswords(!showPasswords)}
          >
            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {isAdminUser && (
          <Button onClick={() => handleOpenModal('add')} className="bg-primary">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        )}
      </div>

      <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="font-bold">Identity</TableHead>
              <TableHead className="font-bold">Role</TableHead>
              <TableHead className="font-bold">Unit</TableHead>
              <TableHead className="font-bold">Email</TableHead>
              <TableHead className="font-bold">Password</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin inline-block opacity-20" /></TableCell></TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Unauthorized or no results found.</TableCell></TableRow>
            ) : (
              filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name || "N/A"}</TableCell>
                  <TableCell><Badge variant={u.role === 'Super Admin' ? 'destructive' : 'secondary'} className="text-[10px]">{u.role}</Badge></TableCell>
                  <TableCell>{u.department || "General"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{u.email}</TableCell>
                  <TableCell className="font-mono text-[10px]">
                    {showPasswords ? (u.password || "N/A") : "••••••••"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenModal('view', u)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
                        {canManageAction(u.role, u.id) && (
                          <DropdownMenuItem onClick={() => handleOpenModal('edit', u)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        )}
                        {canManageAction(u.role, u.id) && currentUser?.id !== u.id && (
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
            <DialogTitle>{modalMode.toUpperCase()} PROFILE</DialogTitle>
            <DialogDescription>
              Manage organizational profile details for this user directory entry.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label>Full Name</Label>
              <Input 
                disabled={modalMode === 'view'} 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input 
                disabled={modalMode !== 'add'} 
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Administrative Password</Label>
              <Input 
                disabled={modalMode === 'view'} 
                type="text"
                value={formData.password} 
                onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Assigned Role</Label>
              <Select 
                disabled={modalMode === 'view' || (!isAdminUser && currentUser?.id !== selectedUser?.id)} 
                value={formData.role} 
                onValueChange={(val: UserRole) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(ROLE_HIERARCHY).map(r => (
                    <SelectItem key={r} value={r} disabled={ROLE_HIERARCHY[r as UserRole] >= currentRolePower && currentUser?.role !== 'Super Admin'}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Department / Unit</Label>
              <Input 
                disabled={modalMode === 'view'} 
                value={formData.department} 
                onChange={(e) => setFormData({ ...formData, department: e.target.value })} 
                required
              />
            </div>
            <DialogFooter>
              {modalMode !== 'view' && (
                <Button type="submit" className="w-full h-11 bg-primary font-bold uppercase tracking-widest text-xs" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {modalMode === 'add' ? 'Deploy Identity' : 'Commit Changes'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanent Removal</AlertDialogTitle>
            <AlertDialogDescription>This will purge the account and role markers from RoleFlow. This action is irreversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abort</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Purge Account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
