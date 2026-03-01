
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, initiateEmailSignIn } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // initiateEmailSignIn is non-blocking but we wrap it in a try/catch
      // to handle UI state if it throws immediately. 
      // Real errors are handled by the GlobalErrorListener.
      initiateEmailSignIn(auth, email, password);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message
      });
    } finally {
      // Give it a tiny delay to allow auth listener to catch up
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4 text-left">
      <div className="space-y-2 text-center mb-6">
        <h2 className="text-xl font-bold text-foreground">Sign In</h2>
        <p className="text-sm text-muted-foreground">Enter your credentials to access the platform</p>
      </div>
      
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

      <Button type="submit" className="w-full h-12 mt-4" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Login to Dashboard"
        )}
      </Button>
    </form>
  );
}
