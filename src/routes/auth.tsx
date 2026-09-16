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
    const result = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    void navigate({ to: "/console", replace: true });
  }

  return (
    <div className="mesh flex min-h-screen items-center justify-center bg-background px-5 font-sans text-foreground antialiased">
      <div className="w-full max-w-sm rounded-xl bg-panel p-6 ring-1 ring-edge sm:p-8">
        <p className="font-mono text-[11px] tracking-[0.18em] text-signal uppercase">
          / owner access
        </p>
        <h1 className="mt-3 text-2xl leading-tight font-semibold tracking-tight">
          Sign in to the console
        </h1>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          Single owner account · new sign-ups are closed.
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
              autoComplete="email"
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
              autoComplete="current-password"
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
            {busy ? "Working…" : "Sign in"}
          </button>
          {error && (
            <p className="font-mono text-[12px] text-destructive" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

