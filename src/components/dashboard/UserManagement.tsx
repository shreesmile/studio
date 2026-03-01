"use client";

import React, { useState, useMemo } from "react";
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
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
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
import { MoreHorizontal, Search, UserPlus, Eye, Edit, Trash2, Loader2, ShieldAlert, AlertTriangle } from "lucide-react";
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
import { useAuthStore } from "@/lib/auth-store";

type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Team Lead' | 'Employee';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  createdAt?: any;
}

export function UserManagement() {
  const db = useFirestore();
  const { toast } = useToast();
  const { profile: currentUser } = useAuthStore();
  const [search, setSearch] = useState("");
  
  // Authorization check
  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const isAdmin = currentUser?.role === 'Admin' || isSuperAdmin;

  // Firestore Data - Real-time subscription
  const usersRef = useMemoFirebase(() => collection(db, "users"), [db]);
  const { data: users, isLoading } = useCollection<UserData>(usersRef);

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedUser, setSelectedUser] = useState<Partial<UserData> | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<UserData>>({
    name: '',
    email: '',
    role: 'Employee',
    department: ''
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      const name = u.name?.toLowerCase() || "";
      const role = u.role?.toLowerCase() || "";
      const email = u.email?.toLowerCase() || "";
      const term = search.toLowerCase();
      return name.includes(term) || role.includes(term) || email.includes(term);
    });
  }, [users, search]);

  const handleOpenModal = (mode: 'add' | 'edit' | 'view', user?: UserData) => {
    setModalMode(mode);
    if (user) {
      setFormData(user);
      setSelectedUser(user);
    } else {
      setFormData({ name: '', email: '', role: 'Employee', department: '' });
      setSelectedUser(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') return;

    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "You do not have the required administrative role to perform this action."
      });
      return;
    }
    
    try {
      if (modalMode === 'add') {
        const newId = doc(collection(db, "users")).id;
        const newDocRef = doc(db, "users", newId);
        
        const userData = {
          ...formData,
          id: newId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          managerChainIds: []
        };

        setDocumentNonBlocking(newDocRef, userData, { merge: true });

        // Update role existence for RBAC rules
        const roleKey = formData.role?.toLowerCase().replace(/\s+/g, '_') || 'employee';
        const roleRef = doc(db, `user_roles_${roleKey}`, newId);
        setDocumentNonBlocking(roleRef, { active: true }, { merge: true });

        toast({ title: "User Added", description: `${formData.name} has been added to the system.` });
      } else if (modalMode === 'edit' && selectedUser?.id) {
        const docRef = doc(db, "users", selectedUser.id);
        updateDocumentNonBlocking(docRef, {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast({ title: "User Updated", description: "The user profile has been successfully updated." });
      }
      setIsModalOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const confirmDelete = () => {
    if (!userToDelete) return;
    if (!isSuperAdmin) {
      toast({ variant: "destructive", title: "Access Denied", description: "Only Super Admins can delete users." });
      return;
    }
    try {
      const docRef = doc(db, "users", userToDelete);
      deleteDocumentNonBlocking(docRef);
      toast({ title: "User Deleted", description: "The user has been removed from the system." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3 text-amber-800 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <p>Your current role (<strong>{currentUser?.role}</strong>) has limited administrative access. Contact a Super Admin to upgrade your permissions.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search users..." 
            className="pl-9 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isAdmin && (
          <Button onClick={() => handleOpenModal('add')} className="bg-primary hover:bg-primary/90">
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">User Name</TableHead>
              <TableHead className="font-bold">Role</TableHead>
              <TableHead className="font-bold">Department</TableHead>
              <TableHead className="font-bold">Email</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading directory...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No users found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={u.role === 'Super Admin' ? 'destructive' : 'secondary'}
                      className="text-[10px] uppercase tracking-wider px-2 py-0"
                    >
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.department || "Unassigned"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenModal('view', u)}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem onClick={() => handleOpenModal('edit', u)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Profile
                          </DropdownMenuItem>
                        )}
                        {isSuperAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:bg-destructive/10"
                              onClick={() => {
                                setUserToDelete(u.id);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete User
                            </DropdownMenuItem>
                          </>
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

      {/* Add / Edit / View Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'add' ? 'Add New User' : modalMode === 'edit' ? 'Edit User Profile' : 'User Details'}
            </DialogTitle>
            <DialogDescription>
              {modalMode === 'view' ? 'Comprehensive profile information.' : 'Enter the user details below to synchronize with RoleFlow.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                disabled={modalMode === 'view'}
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Alice Johnson"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                disabled={modalMode === 'view' || modalMode === 'edit'}
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="alice@roleflow.io"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">System Role</Label>
              <Select 
                disabled={modalMode === 'view' || !isSuperAdmin}
                value={formData.role} 
                onValueChange={(val: UserRole) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Super Admin">Super Admin</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Team Lead">Team Lead</SelectItem>
                  <SelectItem value="Employee">Employee</SelectItem>
                </SelectContent>
              </Select>
              {modalMode !== 'view' && !isSuperAdmin && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Only Super Admins can modify system roles.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                disabled={modalMode === 'view'}
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Engineering"
              />
            </div>
            
            <DialogFooter className="pt-4">
              {modalMode === 'view' ? (
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Close</Button>
              ) : (
                <>
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit">
                    {modalMode === 'add' ? 'Create User' : 'Save Changes'}
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user's
              profile from the RoleFlow database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}