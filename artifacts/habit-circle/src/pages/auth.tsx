import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useSignIn, useSignUp, getGetMeQueryKey } from "@workspace/api-client-react";
import { Mark } from "@/components/shell";
import { errorMessage } from "@/lib/habit-utils";

function Field({ label, id, ...rest }: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-medium">{label}</span>
      <input
        id={id}
        data-testid={`input-${id}`}
        {...rest}
        className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-[15px] outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20"
      />
    </label>
  );
}

export default function AuthPage({ mode }: { mode: "signin" | "signup" }) {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const signIn = useSignIn();
  const signUp = useSignUp();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isUp = mode === "signup";
  const pending = signIn.isPending || signUp.isPending;

  const onSuccess = (user: unknown) => {
    qc.clear();
    qc.setQueryData(getGetMeQueryKey(), user);
    setLocation("/my-habits");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isUp && !displayName.trim()) return setError("Please enter a display name.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    const onError = (err: unknown) => setError(errorMessage(err));
    if (isUp) signUp.mutate({ data: { displayName: displayName.trim(), email: email.trim(), password } }, { onSuccess, onError });
    else signIn.mutate({ data: { email: email.trim(), password } }, { onSuccess, onError });
  };

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden lg:flex flex-col justify-between bg-sidebar text-sidebar-foreground p-12 overflow-hidden">
        <div className="flex items-center gap-2.5">
          <Mark className="w-8 h-8" />
          <span className="font-serif text-xl">Habit Circle</span>
        </div>
        <div className="absolute -right-40 top-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full border border-sidebar-foreground/10" />
        <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-sidebar-foreground/15" />
        <div className="absolute right-24 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-sidebar-primary/90" />
        <div className="relative max-w-md rise">
          <h1 className="font-serif text-5xl leading-[1.05]">Small things, done daily, among people you know.</h1>
          <p className="mt-6 text-sidebar-foreground/70 leading-relaxed">
            Keep your habits to yourself, or share the ones you want to talk about. Tick off the day, see the streak, ask the circle.
          </p>
        </div>
        <p className="relative text-xs text-sidebar-foreground/50">A quiet tracker for friends and colleagues.</p>
      </section>

      <section className="flex items-center justify-center px-6 py-14">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5 rise" data-testid={`form-${mode}`}>
          <div className="lg:hidden flex items-center gap-2 text-primary mb-6">
            <Mark className="w-7 h-7" />
            <span className="font-serif text-xl text-foreground">Habit Circle</span>
          </div>
          <div>
            <h2 className="font-serif text-3xl">{isUp ? "Sign up" : "Sign in"}</h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {isUp ? "Your account is ready the moment you join." : "Welcome back. Your habits are waiting."}
            </p>
          </div>
          {isUp && <Field label="Display name" id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} autoComplete="name" required />}
          <Field label="Email" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" required />
          <Field label="Password" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={128} autoComplete={isUp ? "new-password" : "current-password"} required />
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2" data-testid="text-auth-error">{error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            data-testid={`button-${mode}`}
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition hover:brightness-110 active:scale-[.99] disabled:opacity-60"
          >
            {pending ? "One moment..." : isUp ? "Sign up" : "Sign in"}
          </button>
          <p className="text-sm text-muted-foreground text-center">
            {isUp ? "Already have an account? " : "New here? "}
            <Link href={isUp ? "/sign-in" : "/sign-up"} className="text-primary font-medium underline-offset-4 hover:underline" data-testid={`link-${isUp ? "sign-in" : "sign-up"}`}>
              {isUp ? "Sign in" : "Sign up"}
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
