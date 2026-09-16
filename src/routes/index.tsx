import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Topic Intake — PACKET.relay" },
      {
        name: "description",
        content: "Enter your name and claim one of the available presentation topics.",
      },
      { property: "og:title", content: "Topic Intake — PACKET.relay" },
      {
        property: "og:description",
        content: "Enter your name and claim one of the available presentation topics.",
      },
    ],
  }),
  component: IntakePage,
});

type Topic = { id: string; title: string; is_taken: boolean };

function IntakePage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [topicId, setTopicId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; topic: string; at: string } | null>(null);

  const topicsQuery = useQuery({
    queryKey: ["topics"],
    queryFn: async (): Promise<Topic[]> => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, title, is_taken")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const topics = topicsQuery.data ?? [];
  const available = topics.filter((t) => !t.is_taken);

  const submit = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Please enter your name.");
      if (!topicId) throw new Error("Please choose a topic.");
      const { error } = await supabase
        .from("submissions")
        .insert({ student_name: trimmed, topic_id: topicId });
      if (error) {
        if (error.message.includes("already been taken"))
          throw new Error("That topic was just taken by someone else. Please pick another.");
        if (error.message.includes("submissions_student_name_unique"))
          throw new Error("This name has already submitted a topic.");
        if (error.message.includes("submissions_topic_id_key"))
          throw new Error("That topic was just taken by someone else. Please pick another.");
        throw new Error(error.message);
      }
      return { topic: topics.find((t) => t.id === topicId)?.title ?? "", name: trimmed };
    },
    onSuccess: (result) => {
      setError(null);
      setDone({
        name: result.name,
        topic: result.topic,
        at: new Date().toISOString().slice(0, 19).replace("T", " ") + "Z",
      });
      setName("");
      setTopicId("");
      void queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased">
      <section className="mesh relative">
        <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-md bg-signal/10 ring-1 ring-signal/30">
                <span className="pulse-dot size-2 rounded-full bg-signal" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">
                  PACKET<span className="text-signal">.relay</span>
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">v0.4 · topic intake</p>
              </div>
            </div>
            <span className="hidden items-center gap-2 rounded-full bg-panel/80 px-3 py-1 font-mono text-[11px] text-muted-foreground ring-1 ring-edge sm:inline-flex">
              <span className="size-1.5 rounded-full bg-signal" /> channel open
            </span>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="col-span-2 rounded-xl bg-panel p-6 ring-1 ring-edge sm:p-8 lg:row-span-2">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[11px] tracking-[0.18em] text-signal uppercase">
                  / transmit
                </p>
                <span className="font-mono text-[11px] text-muted-foreground">pkt#A1F2</span>
              </div>
              <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
                Send your topic
              </h1>
              <p className="mt-2 max-w-[40ch] text-base text-pretty text-muted-foreground">
                A single focused handshake. Enter your name and choose an available topic — it gets
                logged to the owner's console.
              </p>

              <form
                className="mt-7 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit.mutate();
                }}
              >
                <div>
                  <label
                    htmlFor="student-name"
                    className="mb-1.5 block font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase"
                  >
                    Name
                  </label>
                  <input
                    id="student-name"
                    type="text"
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Amara Okafor"
                    className="w-full rounded-md bg-ink px-3.5 py-2.5 text-sm ring-1 ring-edge transition-shadow placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-signal/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="topic"
                    className="mb-1.5 block font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase"
                  >
                    Topic
                  </label>
                  <select
                    id="topic"
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                    className="w-full rounded-md bg-ink px-3.5 py-2.5 text-sm ring-1 ring-edge transition-shadow focus:ring-2 focus:ring-signal/60 focus:outline-none"
                  >
                    <option value="">
                      {topicsQuery.isLoading
                        ? "loading topics…"
                        : available.length === 0
                          ? "no topics available yet"
                          : "select an available topic"}
                    </option>
                    {available.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                  {topics.length > available.length && (
                    <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                      {topics.length - available.length} topic(s) already claimed and hidden
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={submit.isPending}
                  className="w-full rounded-md bg-signal px-3 py-2.5 text-sm font-semibold text-ink ring-1 ring-signal/40 transition-shadow hover:ring-2 hover:ring-signal/70 disabled:opacity-60"
                >
                  {submit.isPending ? "Transmitting…" : "Transmit packet"}
                </button>
                {error && (
                  <p className="font-mono text-[12px] text-destructive" role="alert">
                    {error}
                  </p>
                )}
              </form>
            </div>

            <div className="rounded-xl bg-panel p-5 ring-1 ring-edge">
              <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                status
              </p>
              <p className="mt-3 flex items-center gap-2 text-base font-semibold text-signal">
                <span className="pulse-dot size-2 rounded-full bg-signal" /> accepting
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">one topic per name</p>
            </div>

            <div className="rounded-xl bg-panel p-5 ring-1 ring-edge">
              <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                available
              </p>
              <p className="mt-3 text-3xl leading-none font-semibold tracking-tight">
                {String(available.length).padStart(2, "0")}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">topics open</p>
            </div>

            {done && (
              <div className="col-span-2 rounded-xl bg-signal/8 p-5 ring-1 ring-signal/25">
                <div className="flex items-start gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-md bg-signal/15 ring-1 ring-signal/40">
                    <span className="font-mono text-sm font-semibold text-signal">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Packet accepted</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {done.name} · {done.topic} · {done.at} · owner console
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="mt-10 font-mono text-[11px] text-muted-foreground">
            owner-only ·{" "}
            <Link to="/auth" className="text-signal hover:underline">
              console access
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
