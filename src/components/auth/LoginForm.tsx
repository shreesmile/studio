
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, getIdToken } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, LogIn, Sparkles, AlertCircle, ShieldCheck } from "lucide-react";
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
    setIsLoading(true);
    setAuthError(null);
    
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

        // Write to Firestore - Rules now allow this self-creation
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
        errorMessage = "This identity is already registered. Please try signing in.";
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid credentials. Please verify your email and password.";
      } else if (error.code === 'permission-denied') {
        errorMessage = "Identity initialization failed due to security constraints.";
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
    <div className="w-full">
      <form onSubmit={handleAuth} className="space-y-4">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Join the professional RBAC platform" : "Sign in to access your command center"}
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
            <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest opacity-60">Full Name</Label>
            <Input 
              id="name" 
              placeholder="John Doe" 
              required 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 bg-muted/30 border-none rounded-xl"
            />
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest opacity-60">Email Address</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="admin@roleflow.io" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 bg-muted/30 border-none rounded-xl"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest opacity-60">Password</Label>
          <Input 
            id="password" 
            type="password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 bg-muted/30 border-none rounded-xl"
          />
        </div>

        {isSignUp && (
          <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
            <Label htmlFor="role" className="text-[10px] font-bold uppercase tracking-widest opacity-60">Initial Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-11 bg-muted/30 border-none rounded-xl">
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

        <Button type="submit" className="w-full h-12 mt-4 bg-primary hover:bg-primary/90 rounded-xl" disabled={isLoading}>
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

      <div className="space-y-4 pt-6 text-center">
        <button 
          type="button"
          className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium" 
          onClick={() => {
            setIsSignUp(!isSignUp);
            setAuthError(null);
          }}
        >
          {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Create one"}
        </button>

        {!isSignUp && (
          <Button 
            variant="outline" 
            className="w-full h-11 border-accent/20 text-accent hover:bg-accent/5 rounded-xl text-xs font-bold" 
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