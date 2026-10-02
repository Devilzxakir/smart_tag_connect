import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  useEffect(() => {
    let mounted = true;

    const handleCallback = async () => {
      // First check if there's already a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        if (mounted) {
          // Check if user has a profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", session.user.id)
            .maybeSingle();
          
          if (profile) {
            window.location.href = "/home";
          } else {
            // New Google user - redirect to complete profile
            window.location.href = "/auth/complete-profile";
          }
        }
        return;
      }

      // Try to exchange the code from URL
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      
      if (error) {
        console.error("OAuth callback error:", error);
        // Wait a bit and check if session was established via detectSessionInUrl
        setTimeout(async () => {
          const { data: { session: newSession } } = await supabase.auth.getSession();
          if (newSession && mounted) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", newSession.user.id)
              .maybeSingle();
            
            if (profile) {
              window.location.href = "/home";
            } else {
              window.location.href = "/auth/complete-profile";
            }
          } else if (mounted) {
            window.location.href = "/?error=oauth_failed";
          }
        }, 1000);
      } else if (mounted) {
        // Check profile after successful exchange
        const { data: { session: newSession } } = await supabase.auth.getSession();
        if (newSession) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", newSession.user.id)
            .maybeSingle();
          
          if (profile) {
            window.location.href = "/home";
          } else {
            window.location.href = "/auth/complete-profile";
          }
        } else {
          window.location.href = "/home";
        }
      }
    };

    handleCallback();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Button disabled className="w-full max-w-md">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Completing sign in...
      </Button>
    </div>
  );
}