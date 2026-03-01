
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
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
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
  deleteDocumentNonBlocking
} from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore, UserRole } from "@/lib/auth-store";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  password?: string;
  createdAt?: any;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  'Super Admin': 100,
  'Admin': 80,
  'Manager': 60,
  'Team Lead': 40,
  'Employee': 20
};

export function UserManagement() {
  const db = useFirestore();
  const { toast } = useToast();
  const { profile: currentUser } = useAuthStore();
  const [search, setSearch] = useState("");
  const [showPasswords, setShowPasswords] = useState(true);
  
  const currentRolePower = useMemo(() => 
    ROLE_HIERARCHY[currentUser?.role || 'Employee'], 
  [currentUser?.role]);

  // Firestore Data - Memoized
  const usersRef = useMemoFirebase(() => collection(db, "users"), [db]);
  const { data: users, isLoading } = useCollection<UserData>(usersRef);

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedUser, setSelectedUser] = useState<Partial<UserData> | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<UserData>>({
    name: '',
    email: '',
    role: 'Employee',
    department: '',
    password: ''
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const term = search.toLowerCase().trim();
    return users.filter(u => {
      const name = (u.name || "").toLowerCase();
      const role = (u.role || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      
      const targetPower = ROLE_HIERARCHY[u.role] || 0;
      const isVisible = currentUser?.role === 'Super Admin' || currentRolePower >= targetPower;

      if (!isVisible) return false;
      if (!term) return true;
      
      return name.includes(term) || role.includes(term) || email.includes(term);
    });
  }, [users, search, currentUser?.role, currentRolePower]);

  const canManage = useCallback((targetRole: UserRole) => {
    if (currentUser?.role === 'Super Admin') return true;
    if (currentUser?.role === 'Admin' && targetRole !== 'Super Admin') return true;
    if (currentUser?.role === 'Manager' && (targetRole === 'Team Lead' || targetRole === 'Employee')) return true;
    if (currentUser?.role === 'Team Lead' && targetRole === 'Employee') return true;
    return false;
  }, [currentUser?.role]);

  const handleOpenModal = useCallback((mode: 'add' | 'edit' | 'view', user?: UserData) => {
    setModalMode(mode);
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'Employee',
        department: user.department || '',
        password: user.password || ''
      });
      setSelectedUser(user);
    } else {
      setFormData({ name: '', email: '', role: 'Employee', department: '', password: '' });
      setSelectedUser(null);
    }
    setIsModalOpen(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') return;
    
    try {
      if (modalMode === 'add') {
        const newId = doc(collection(db, "users")).id;
        const newDocRef = doc(db, "users", newId);
        const userData = { 
          ...formData, 
          id: newId, 
          createdAt: serverTimestamp(), 
          updatedAt: serverTimestamp() 
        };
        setDocumentNonBlocking(newDocRef, userData, { merge: true });
        
        const roleKey = (formData.role || "Employee").toLowerCase().replace(/\s+/g, '_');
        setDocumentNonBlocking(doc(db, `user_roles_${roleKey}`, newId), { active: true }, { merge: true });

        toast({ title: "User Created", description: "The profile has been added to RoleFlow." });
      } else if (modalMode === 'edit' && selectedUser?.id) {
        updateDocumentNonBlocking(doc(db, "users", selectedUser.id), { 
          ...formData, 
          updatedAt: serverTimestamp() 
        });
        toast({ title: "Profile Updated", description: "Changes saved successfully." });
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Action Failed", description: error.message });
    }
  };

  const confirmDelete = () => {
    if (!userToDelete) return;
    deleteDocumentNonBlocking(doc(db, "users", userToDelete));
    toast({ title: "User Removed", description: "The account was deleted from the system." });
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
              placeholder="Search team..." 
              className="pl-9 bg-white focus-visible:ring-1"
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
        {(currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin') && (
          <Button onClick={() => handleOpenModal('add')} className="bg-primary hover:opacity-90">
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="font-bold">Name</TableHead>
              <TableHead className="font-bold">Role</TableHead>
              <TableHead className="font-bold">Department</TableHead>
              <TableHead className="font-bold">Email</TableHead>
              <TableHead className="font-bold">Password</TableHead>
              <TableHead className="text-right font-bold">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin inline-block text-primary/40" /></TableCell></TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No authorized users found.</TableCell></TableRow>
            ) : (
              filteredUsers.map((u) => (
                <TableRow key={u.id} className="transition-colors">
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell><Badge variant={u.role === 'Super Admin' ? 'destructive' : 'secondary'} className="text-[10px] py-0">{u.role}</Badge></TableCell>
                  <TableCell>{u.department || "N/A"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {showPasswords ? (u.password || "N/A") : "••••••••"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenModal('view', u)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
                        {canManage(u.role) && (
                          <DropdownMenuItem onClick={() => handleOpenModal('edit', u)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        )}
                        {canManage(u.role) && (
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
            <DialogTitle className="tracking-tight">{modalMode.toUpperCase()} USER PROFILE</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="u-name">Full Name</Label>
              <Input id="u-name" disabled={modalMode === 'view'} value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" disabled={modalMode !== 'add'} value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="u-pass">Password</Label>
              <Input 
                id="u-pass"
                type="text" 
                disabled={modalMode === 'view'} 
                value={formData.password || ''} 
                onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="u-role">Assign Role</Label>
              <Select 
                disabled={modalMode === 'view' || (currentUser?.role !== 'Super Admin' && currentUser?.role !== 'Admin')} 
                value={formData.role || 'Employee'} 
                onValueChange={(val: UserRole) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger id="u-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(ROLE_HIERARCHY).map(r => (
                    <SelectItem key={r} value={r} disabled={ROLE_HIERARCHY[r as UserRole] > currentRolePower}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="u-dept">Department</Label>
              <Input id="u-dept" disabled={modalMode === 'view'} value={formData.department || ''} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
            </div>
            <DialogFooter className="pt-4">
              {modalMode !== 'view' && <Button type="submit" className="w-full sm:w-auto">Save Profile</Button>}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Removal</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the user from the organization hierarchy and revoke all access.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete Account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
