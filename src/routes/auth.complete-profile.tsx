import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useUser, updateProfile as updateProfileFn } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth/complete-profile")({
  head: () => ({
    meta: [
      { title: "Complete Profile — NFC Smart Keychain" },
      { name: "description", content: "Complete your profile setup." },
    ],
  }),
  component: CompleteProfilePage,
});

function CompleteProfilePage() {
  const { user, ready } = useUser();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!ready) {
    return (
      <AppShell title="Complete Profile">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell title="Complete Profile">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Please sign in first.</p>
        </div>
      </AppShell>
    );
  }

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      // Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { full_name: fullName.trim() },
      });
      if (updateError) throw updateError;

      // Create/update profile in public.profiles
      await updateProfileFn(user.id, {
        fullName: fullName.trim(),
        phone: user.phone,
      });

      toast.success("Profile completed successfully!");
      window.location.href = "/home";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Complete Profile">
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="size-8" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Welcome!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete your profile to get started
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (from Google)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="pl-10 bg-muted"
              />
            </div>
            <p className="text-xs text-muted-foreground">This email is from your Google account.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Set Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="pl-10"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleComplete} disabled={saving} className="w-full" size="lg">
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Completing...
              </>
            ) : (
              "Complete Setup"
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}