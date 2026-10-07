import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Nfc, Sun, Moon, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp, useUser } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — NFC Smart Keychain" },
      {
        name: "description",
        content: "Sign in to write, read and manage your NFC smart keychain tags.",
      },
      { property: "og:title", content: "Sign in — NFC Smart Keychain" },
      {
        property: "og:description",
        content: "Sign in to write, read and manage your NFC smart keychain tags.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, ready } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: "/home" });
  }, [ready, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.includes("@") || password.length < 8) {
      setError("Enter an email and a password of at least 8 characters.");
      return;
    }
    if (mode === "signup") {
      if (!fullName.trim()) {
        setError("Full name is required.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { needsConfirmation } = await signUp(
          email,
          password,
          fullName.trim(),
          phone.trim() || undefined,
        );
        if (needsConfirmation) {
          toast.success(
            "Account created! Please check your email to confirm your account, then log in.",
          );
          setMode("login");
          return;
        }
        // If no confirmation needed, sign in automatically
        await signIn(email, password);
      } else {
        await signIn(email, password);
      }
      navigate({ to: "/home" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError("");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError("Google sign-in failed. Try email and password instead.");
      return;
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-6 flex justify-end">
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "light" ? <Moon className="size-5" /> : <Sun className="size-5" />}
        </Button>
      </div>
      <div className="mb-10">
        <div className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
          <Nfc className="size-7" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          NFC Smart Keychain
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap, write and read your smart tags. Prototype build.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={
              mode === m
                ? "rounded-lg bg-background py-2 text-sm font-medium text-foreground shadow-sm"
                : "rounded-lg py-2 text-sm font-medium text-muted-foreground"
            }
          >
            {m === "login" ? "Log in" : "Sign up"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
        )}
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          {mode === "login" ? "Log in" : "Create account"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" size="lg" className="w-full" onClick={google} type="button">
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Your tags are saved to your account, so you can open them from any phone.
      </p>
    </div>
  );
}
