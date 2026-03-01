"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, LogIn, Sparkles } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Employee");
  const [isLoading, setIsLoading] = useState(false);
  
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create Firestore profile
        await setDoc(doc(db, "users", user.uid), {
          id: user.uid,
          name,
          email,
          role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          managerChainIds: []
        });

        // Add to role-specific collection for security rules (DBAC)
        const rolePath = `user_roles_${role.toLowerCase().replace(" ", "_")}`;
        await setDoc(doc(db, rolePath, user.uid), { active: true });

        toast({
          title: "Account created",
          description: `Welcome to RoleFlow, ${name}!`
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Authentication error",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail("admin@roleflow.io");
    setPassword("password123");
    setIsSignUp(false);
    // Note: This requires the user to exist in Firebase Auth already.
    // For a real prototype, users should create their account first.
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAuth} className="space-y-4 text-left">
        <div className="space-y-2 text-center mb-6">
          <h2 className="text-xl font-bold text-foreground">
            {isSignUp ? "Create Account" : "Sign In"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Join the professional RBAC platform" : "Enter your credentials to access RoleFlow"}
          </p>
        </div>
        
        {isSignUp && (
          <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              placeholder="John Doe" 
              required 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="email">Email Address</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="admin@roleflow.io" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            type="password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {isSignUp && (
          <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
            <Label htmlFor="role">Initial Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
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
          </div>
        )}

        <Button type="submit" className="w-full h-12 mt-4" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {isSignUp ? <UserPlus className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />}
              {isSignUp ? "Register Account" : "Login to Dashboard"}
            </>
          )}
        </Button>
      </form>

      <div className="space-y-4 pt-2">
        <Button 
          variant="ghost" 
          className="w-full text-xs" 
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Create one"}
        </Button>

        {!isSignUp && (
          <Button 
            variant="outline" 
            className="w-full h-10 border-accent/20 text-accent hover:bg-accent/5" 
            onClick={handleDemoLogin}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Quick Demo Credentials
          </Button>
        )}
      </div>
    </div>
  );
}