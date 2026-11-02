import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useSignOut, type User } from "@workspace/api-client-react";
import { LogOut, Sprout, Users } from "lucide-react";
import { initials } from "@/lib/habit-utils";
import { useState } from "react";

export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeDasharray="62 20" strokeLinecap="round" transform="rotate(-50 16 16)" />
      <circle cx="16" cy="16" r="4.2" fill="hsl(var(--sidebar-primary))" />
    </svg>
  );
}

const nav = [
  { href: "/my-habits", label: "My habits", icon: Sprout, id: "my-habits" },
  { href: "/community", label: "Community", icon: Users, id: "community" },
];

export function Shell({ user, children }: { user: User; children: ReactNode }) {
  const [loc, setLocation] = useLocation();
  const qc = useQueryClient();
  const signOut = useSignOut();
  const [signOutError, setSignOutError] = useState(false);
  const active = (href: string) =>
    loc === href || false;

  const doSignOut = () =>
    signOut.mutate(undefined, {
      onSuccess: () => {
        qc.clear();
        setLocation("/sign-in");
      },
      onError: () => setSignOutError(true),
    });

  return (
    <div className="min-h-[100dvh] md:grid md:grid-cols-[248px_1fr]">
      <aside className="hidden md:flex flex-col bg-sidebar text-sidebar-foreground p-5 sticky top-0 h-[100dvh]">
        <Link href="/my-habits" className="flex items-center gap-2.5 px-2 mb-10" data-testid="link-logo-sidebar">
          <Mark className="w-7 h-7" />
          <span className="font-serif text-xl">Habit Circle</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              data-testid={`sidebar-link-${n.id}`}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active(n.href) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "opacity-75 hover:opacity-100 hover:bg-sidebar-accent/60"
              }`}
            >
              <n.icon className="w-4 h-4" />
              {n.label}
              {active(n.href) && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-9 h-9 rounded-full bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center text-xs font-semibold">
              {initials(user.displayName)}
            </div>
            <div className="min-w-0">
              <div className="text-sm truncate" data-testid="text-current-user">{user.displayName}</div>
              <div className="text-xs opacity-60 truncate">{user.email}</div>
            </div>
          </div>
          <button
            onClick={doSignOut}
            disabled={signOut.isPending}
            data-testid="sidebar-button-sign-out"
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm opacity-75 hover:opacity-100 hover:bg-sidebar-accent/60 transition"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border">
          <div className="max-w-3xl mx-auto px-5 h-14 flex items-center gap-1">
            <Link href="/my-habits" className="md:hidden mr-2 text-primary" data-testid="link-logo-header">
              <Mark className="w-6 h-6" />
            </Link>
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                data-testid={`header-link-${n.id}`}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  active(n.href) ? "bg-secondary text-secondary-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
              </Link>
            ))}
            <button
              onClick={doSignOut}
              disabled={signOut.isPending}
              data-testid="header-button-sign-out"
              className="ml-auto px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 w-full max-w-3xl mx-auto px-5 py-10">
          {signOutError && <p role="alert" className="mb-5 text-sm text-destructive">Could not sign out. Please try again.</p>}
          {children}
        </main>
      </div>
    </div>
  );
}
