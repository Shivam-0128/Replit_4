import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListHabits, useAddHabit, getListHabitsQueryKey, getListCommunityQueryKey } from "@workspace/api-client-react";
import { Check, Lock, Users } from "lucide-react";
import { errorMessage, localDateKey } from "@/lib/habit-utils";

export function SharedBadge({ shared, id }: { shared: boolean; id: number }) {
  return (
    <span
      data-testid={`status-sharing-${id}`}
      className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 ${
        shared ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
      }`}
    >
      {shared ? <Users className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
      {shared ? "Shared" : "Private"}
    </span>
  );
}

export function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}

export default function MyHabits() {
  const qc = useQueryClient();
  const habits = useListHabits();
  const add = useAddHabit();
  const [name, setName] = useState("");
  const [when, setWhen] = useState("");
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = localDateKey(new Date());

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !when.trim()) return setError("Please fill in both fields.");
    add.mutate(
      { data: { name: name.trim(), whenIDoIt: when.trim(), shared } },
      {
        onSuccess: () => {
          setName("");
          setWhen("");
          setShared(false);
          qc.invalidateQueries({ queryKey: getListHabitsQueryKey() });
          qc.invalidateQueries({ queryKey: getListCommunityQueryKey() });
        },
        onError: (err) => setError(errorMessage(err)),
      },
    );
  };

  const inputCls =
    "mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-[15px] outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20";

  return (
    <div className="space-y-12">
      <header className="rise">
        <p className="text-sm text-muted-foreground">Only you see this list.</p>
        <h1 className="font-serif text-4xl mt-1">My habits</h1>
      </header>

      <form onSubmit={submit} className="rounded-3xl bg-card border border-card-border p-6 md:p-7 space-y-4 rise" data-testid="form-add-habit">
        <label className="block">
          <span className="text-sm font-medium">Habit name</span>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={150} data-testid="input-habit-name" placeholder="Read ten pages" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">When I do it</span>
          <textarea
            className={`${inputCls} min-h-24 resize-y`}
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            maxLength={2000}
            data-testid="input-when-i-do-it"
            placeholder="When I usually do it, and what makes it more likely to happen"
          />
        </label>
        <div className="flex flex-wrap items-center gap-4 justify-between pt-1">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="peer sr-only" data-testid="checkbox-share" />
            <span className="w-5 h-5 rounded-md border-2 border-input grid place-items-center transition peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:ring-4 peer-focus-visible:ring-ring/30">
              {shared && <Check className="w-3.5 h-3.5 text-primary-foreground pop" strokeWidth={3} />}
            </span>
            <span className="text-sm">Share with the community</span>
          </label>
          <button
            type="submit"
            disabled={add.isPending}
            data-testid="button-add-habit"
            className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 font-medium transition hover:brightness-110 active:scale-[.98] disabled:opacity-60"
          >
            {add.isPending ? "Adding..." : "Add habit"}
          </button>
        </div>
        {error && <p className="text-sm text-destructive" data-testid="text-add-error">{error}</p>}
      </form>

      <section>
        {habits.isLoading ? (
          <ListSkeleton />
        ) : habits.isError ? (
          <div className="rounded-2xl border border-border p-6 text-center">
            <p className="text-muted-foreground">Your habits could not be loaded.</p>
            <button onClick={() => habits.refetch()} className="mt-3 text-primary font-medium" data-testid="button-retry">Try again</button>
          </div>
        ) : !habits.data?.length ? (
          <div className="rounded-3xl border-2 border-dashed border-border p-10 text-center" data-testid="empty-habits">
            <div className="mx-auto w-14 h-14 rounded-full border-2 border-primary/30 grid place-items-center">
              <span className="w-3 h-3 rounded-full bg-[hsl(var(--chart-2))]" />
            </div>
            <p className="font-serif text-xl mt-4">Nothing here yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first habit above. Start with something small.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {habits.data.map((h, i) => {
              const doneToday = h.completedDates.includes(today);
              return (
                <li key={h.id} style={{ animationDelay: `${i * 50}ms` }} className="rise rounded-2xl bg-card border border-card-border p-5 flex items-start gap-4" data-testid={`card-habit-${h.id}`}>
                  <span className={`mt-1 w-3 h-3 rounded-full shrink-0 ${doneToday ? "bg-[hsl(var(--chart-2))]" : "border-2 border-input"}`} title={doneToday ? "Done today" : "Not yet today"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/habits/${h.id}`} className="font-serif text-lg hover:text-primary underline-offset-4 hover:underline" data-testid={`link-habit-${h.id}`}>
                        {h.name}
                      </Link>
                      <SharedBadge shared={h.shared} id={h.id} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{h.whenIDoIt}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="font-serif text-2xl leading-none" data-testid={`text-streak-${h.id}`}>{h.currentStreak}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">streak</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
