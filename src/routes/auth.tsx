import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Owner access — PACKET.relay" },
      { name: "description", content: "Owner sign-in for the submission console." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Owner access — PACKET.relay" },
      { property: "og:description", content: "Owner sign-in for the submission console." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/console", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (result.data.session) {
      void navigate({ to: "/console", replace: true });
    } else {
      setError("Check your email to confirm the account, then sign in.");
    }
  }

  return (
    <div className="mesh flex min-h-screen items-center justify-center bg-background px-5 font-sans text-foreground antialiased">
      <div className="w-full max-w-sm rounded-xl bg-panel p-6 ring-1 ring-edge sm:p-8">
        <p className="font-mono text-[11px] tracking-[0.18em] text-signal uppercase">
          / owner access
        </p>
        <h1 className="mt-3 text-2xl leading-tight font-semibold tracking-tight">
          {mode === "signin" ? "Sign in to the console" : "Create the owner account"}
        </h1>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          The first account created becomes the owner.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-ink px-3.5 py-2.5 text-sm ring-1 ring-edge focus:ring-2 focus:ring-signal/60 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-ink px-3.5 py-2.5 text-sm ring-1 ring-edge focus:ring-2 focus:ring-signal/60 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-signal px-3 py-2.5 text-sm font-semibold text-ink ring-1 ring-signal/40 transition-shadow hover:ring-2 hover:ring-signal/70 disabled:opacity-60"
          >
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          {error && (
            <p className="font-mono text-[12px] text-destructive" role="alert">
              {error}
            </p>
          )}
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="mt-5 font-mono text-[11px] text-muted-foreground hover:text-signal"
        >
          {mode === "signin" ? "No account yet? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
