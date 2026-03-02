
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, getIdToken } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, LogIn, Sparkles, AlertCircle } from "lucide-react";
import { useAuthStore, UserRole as StoreUserRole } from "@/lib/auth-store";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Employee");
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { setProfile } = useAuthStore();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(false);
    setAuthError(null);
    setIsLoading(true);
    
    console.log(`[AuthAction] Attempting ${isSignUp ? 'Sign Up' : 'Login'} for ${email}`);
    
    try {
      let user;
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
        
        const profileData = {
          id: user.uid,
          name: name || "Anonymous User",
          email: email,
          password: password,
          role: role as StoreUserRole,
          department: "General",
          status: "Active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, "users", user.uid), profileData);
        setProfile(profileData as any);

        toast({
          title: "Account created",
          description: `Welcome to RoleFlow, ${name}!`
        });
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      }

      const idToken = await getIdToken(user);
      await fetch('/api/auth/session', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: any) {
      console.error("[AuthAction] Authentication failed:", error.code);
      
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This identity is already registered in our system. Please try signing in instead.";
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid clearance credentials. Please verify your email and passkey.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The provided passkey does not meet organizational security standards.";
      }
      
      setAuthError(errorMessage);
      toast({
        variant: "destructive",
        title: "Security Conflict",
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail("admin@roleflow.io");
    setPassword("password123");
    setIsSignUp(false);
    setAuthError(null);
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

        {authError && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive text-[11px] font-bold">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="uppercase tracking-widest text-[9px] mb-1">Authorization Error</AlertTitle>
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}
        
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
              Verifying...
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
          onClick={() => {
            setIsSignUp(!isSignUp);
            setAuthError(null);
          }}
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
