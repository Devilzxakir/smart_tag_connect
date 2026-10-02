import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Nfc, Mail, Phone, User, Save, Shield, LogOut, Edit2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useUser, signOut, updateProfile } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — NFC Smart Keychain" },
      { name: "description", content: "Manage your account settings and profile information." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, ready } = useUser();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ready && user) {
      setFullName(user.fullName ?? "");
      setPhone(user.phone ?? "");
      setEmail(user.email ?? "");
    }
  }, [ready, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, { fullName: fullName.trim(), phone: phone.trim() });
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <AppShell title="Profile">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell title="Profile">
        <p className="text-center text-muted-foreground">Please sign in to view your profile.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Profile" subtitle={user.email}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <User className="size-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">{fullName || "Your Name"}</h2>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-card-foreground">Account Information</h3>
          
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact support if needed.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-card-foreground">Security</h3>
          
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Shield className="size-5" />
              </div>
              <div>
                <p className="font-medium text-card-foreground">Password</p>
                <p className="text-xs text-muted-foreground">Change your password</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => toast.info("Password change coming soon")}>
              Change <Edit2 className="ml-1 size-3" />
            </Button>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <LogOut className="size-5" />
              </div>
              <div>
                <p className="font-medium text-card-foreground">Sign Out</p>
                <p className="text-xs text-muted-foreground">Sign out from all devices</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>Sign Out</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-card-foreground">NFC Tags</h3>
          <p className="text-sm text-muted-foreground">Manage your NFC keychain tags from the dashboard.</p>
          <Button variant="outline" asChild className="w-full">
            <Link to="/tags">Manage Tags <Nfc className="ml-1 size-3" /></Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}