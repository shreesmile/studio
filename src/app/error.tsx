"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#ECF1F4] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg w-full space-y-8 border border-destructive/20">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto animate-pulse">
          <AlertCircle className="text-destructive w-10 h-10" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Application Runtime Error</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
            RoleFlow encountered a critical client-side exception. This is usually caused by temporary network issues or permission constraints.
          </p>
        </div>

        {error.message && (
          <div className="p-4 bg-muted/50 rounded-xl border text-left font-mono text-[10px] overflow-auto max-h-32 text-destructive">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button 
            onClick={() => reset()} 
            className="flex-1 h-12 bg-primary hover:bg-primary/90"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Recover Session
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
            className="flex-1 h-12"
          >
            <Home className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
          Error ID: {error.digest || 'unknown-client-exception'}
        </p>
      </div>
    </div>
  );
}