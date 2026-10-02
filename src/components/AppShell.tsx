import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BarChart3, Home, Nfc, Tags, LogOut, Sun, Moon } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { signOut, useUser } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

const nav = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/tools", label: "NFC Tools", icon: Nfc },
  { to: "/tags", label: "My Tags", icon: Tags },
  { to: "/analytics", label: "Activity", icon: BarChart3 },
] as const;

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  const trimmed = name.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  const first = parts[0] ?? "U";
  const last = parts[parts.length - 1] ?? first;
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

export function AppShell({
  title,
  subtitle,
  children,
  back,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  back?: string | undefined;
}) {
  const navigate = useNavigate();
  const { user, ready } = useUser();
  const { theme, toggleTheme } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (ready && !user) navigate({ to: "/" });
  }, [ready, user, navigate]);

  const initials = getInitials(user?.fullName);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 px-5 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            {back && (
              <Link to={back} className="text-xs font-medium text-primary">
                ← Back
              </Link>
            )}
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="flex size-9 items-center justify-center rounded-full border border-border bg-primary/10 text-primary font-medium text-sm hover:bg-primary/20 transition-colors"
              aria-label="Profile"
            >
              {initials}
            </Link>
            <button
              onClick={toggleTheme}
              className="flex size-9 items-center justify-center rounded-full border border-border bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="size-5" /> : <Sun className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 py-5 pb-28">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-border/60 bg-background/95 px-3 py-2 backdrop-blur">
        <div className="grid grid-cols-4">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(`${to}/`);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
