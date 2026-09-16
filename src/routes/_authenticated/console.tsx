import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/console")({
  head: () => ({
    meta: [
      { title: "Owner console — PACKET.relay" },
      { name: "description", content: "Private log of student submissions and topic list." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Owner console — PACKET.relay" },
      {
        property: "og:description",
        content: "Private log of student submissions and topic list.",
      },
    ],
  }),
  component: ConsolePage,
});

type Submission = {
  id: string;
  student_name: string;
  created_at: string;
  topic_id: string;
};
type Topic = { id: string; title: string; is_taken: boolean; created_at: string };

function fmt(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ConsolePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [error, setError] = useState<string | null>(null);

  const topicsQuery = useQuery({
    queryKey: ["topics"],
    queryFn: async (): Promise<Topic[]> => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, title, is_taken, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const submissionsQuery = useQuery({
    queryKey: ["submissions"],
    queryFn: async (): Promise<Submission[]> => {
      const { data, error } = await supabase
        .from("submissions")
        .select("id, student_name, created_at, topic_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const topics = topicsQuery.data ?? [];
  const titleById = useMemo(
    () => Object.fromEntries(topics.map((t) => [t.id, t.title])),
    [topics],
  );

  const rows = (submissionsQuery.data ?? []).filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.student_name.toLowerCase().includes(q) ||
      (titleById[s.topic_id] ?? "").toLowerCase().includes(q)
    );
  });

  const addTopic = useMutation({
    mutationFn: async () => {
      const title = newTopic.trim();
      if (!title) throw new Error("Enter a topic title.");
      const { error } = await supabase.from("topics").insert({ title });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNewTopic("");
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const removeTopic = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topics").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["topics"] });
      void queryClient.invalidateQueries({ queryKey: ["submissions"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const removeSubmission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("submissions").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["submissions"] });
      void queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased">
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] text-signal uppercase">
              / owner console
            </p>
            <h1 className="mt-2 text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
              Submission log
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or topic…"
              className="w-full rounded-md bg-ink px-3 py-2 text-sm ring-1 ring-edge placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-signal/60 focus:outline-none sm:w-56"
            />
            <span className="rounded-md bg-signal/10 px-3 py-2 font-mono text-[11px] text-signal ring-1 ring-signal/30">
              {rows.length} records
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-md px-3 py-2 font-mono text-[11px] text-muted-foreground ring-1 ring-edge hover:text-signal"
            >
              sign out
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-4 font-mono text-[12px] text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 overflow-hidden rounded-xl ring-1 ring-edge">
          <div className="grid grid-cols-[1fr_auto] bg-ink/60 px-4 py-2.5 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase sm:grid-cols-[1.4fr_1.6fr_auto]">
            <span>Student</span>
            <span className="hidden pr-4 sm:block">Topic</span>
            <span className="text-right">Timestamp</span>
          </div>
          <div className="divide-y divide-edge/60">
            {rows.length === 0 && (
              <p className="px-4 py-6 font-mono text-[12px] text-muted-foreground">
                {submissionsQuery.isLoading ? "loading…" : "no submissions yet"}
              </p>
            )}
            {rows.map((s) => (
              <div
                key={s.id}
                className="group grid grid-cols-[1fr_auto] items-center px-4 py-3 transition-colors hover:bg-signal/5 sm:grid-cols-[1.4fr_1.6fr_auto]"
              >
                <span className="text-sm">{s.student_name}</span>
                <span className="hidden pr-4 text-sm text-muted-foreground sm:block">
                  {titleById[s.topic_id] ?? "—"}
                </span>
                <span className="flex items-center justify-end gap-3 text-right">
                  <span className="font-mono text-[12px] text-muted-foreground">
                    {fmt(s.created_at)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSubmission.mutate(s.id)}
                    className="font-mono text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                    aria-label={`Remove submission by ${s.student_name}`}
                  >
                    remove
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <p className="font-mono text-[11px] tracking-[0.18em] text-signal uppercase">
            / topic list
          </p>
          <h2 className="mt-2 text-xl leading-tight font-semibold tracking-tight sm:text-2xl">
            Topics students can choose from
          </h2>

          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addTopic.mutate();
            }}
          >
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="e.g. Edge inference on mobile SoCs"
              className="flex-1 rounded-md bg-ink px-3.5 py-2.5 text-sm ring-1 ring-edge placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-signal/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={addTopic.isPending}
              className="rounded-md bg-signal px-4 py-2.5 text-sm font-semibold text-ink ring-1 ring-signal/40 transition-shadow hover:ring-2 hover:ring-signal/70 disabled:opacity-60"
            >
              Add topic
            </button>
          </form>

          <div className="mt-5 overflow-hidden rounded-xl ring-1 ring-edge">
            <div className="grid grid-cols-[1fr_auto] bg-ink/60 px-4 py-2.5 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              <span>Topic</span>
              <span className="text-right">State</span>
            </div>
            <div className="divide-y divide-edge/60">
              {topics.length === 0 && (
                <p className="px-4 py-6 font-mono text-[12px] text-muted-foreground">
                  no topics yet — add the first one above
                </p>
              )}
              {topics.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-[1fr_auto] items-center px-4 py-3 transition-colors hover:bg-signal/5"
                >
                  <span className="text-sm">{t.title}</span>
                  <span className="flex items-center justify-end gap-3">
                    <span
                      className={
                        t.is_taken
                          ? "font-mono text-[11px] text-muted-foreground"
                          : "font-mono text-[11px] text-signal"
                      }
                    >
                      {t.is_taken ? "taken" : "available"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTopic.mutate(t.id)}
                      className="font-mono text-[11px] text-muted-foreground hover:text-destructive"
                      aria-label={`Delete topic ${t.title}`}
                    >
                      delete
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-8 font-mono text-[11px] text-muted-foreground">
          owner-only · deleting a topic also removes its submission
        </p>
      </section>
    </div>
  );
}
