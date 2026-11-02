import { useState, type FormEvent } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient, useIsMutating } from "@tanstack/react-query";
import {
  useGetHabit,
  getGetHabitQueryKey,
  useSetCompletion,
  getSetCompletionMutationKey,
  useListComments,
  getListCommentsQueryKey,
  usePostComment,
  getListHabitsQueryKey,
  getListCommunityQueryKey,
  type Habit,
  type User,
} from "@workspace/api-client-react";
import { ArrowLeft, Check } from "lucide-react";
import { errorMessage, initials, lastSevenDays, timeAgo } from "@/lib/habit-utils";
import { SharedBadge } from "@/pages/my-habits";

function DayBox({ habit, date, weekday, isToday, canEdit }: { habit: Habit; date: string; weekday: string; isToday: boolean; canEdit: boolean }) {
  const qc = useQueryClient();
  const setCompletion = useSetCompletion();
  const saving = useIsMutating({ mutationKey: getSetCompletionMutationKey() }) > 0;
  const [err, setErr] = useState(false);
  const checked = habit.completedDates.includes(date);

  const toggle = (next: boolean) => {
    setErr(false);
    const key = getGetHabitQueryKey(habit.id);
    const prev = qc.getQueryData<Habit>(key);
    qc.setQueryData<Habit>(key, (old) =>
      old ? { ...old, completedDates: next ? [...old.completedDates, date] : old.completedDates.filter((d) => d !== date) } : old,
    );
    setCompletion.mutate(
      { id: habit.id, data: { date, completed: next } },
      {
        onSuccess: (h) => {
          qc.setQueryData(key, h);
          qc.invalidateQueries({ queryKey: getListHabitsQueryKey() });
          qc.invalidateQueries({ queryKey: getListCommunityQueryKey() });
        },
        onError: () => {
          qc.setQueryData(key, prev);
          setErr(true);
        },
      },
    );
  };

  return (
    <li>
      <label
        className={`group flex items-center gap-4 rounded-2xl px-4 py-3 transition-colors ${
          checked ? "bg-secondary/70" : "bg-transparent"
        } ${canEdit ? "cursor-pointer hover:bg-secondary/50" : "cursor-default"}`}
      >
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={!canEdit || saving}
          onChange={(e) => toggle(e.target.checked)}
          data-testid={`checkbox-day-${date}`}
          aria-label={date}
        />
        <span className="relative w-8 h-8 shrink-0 grid place-items-center peer-focus-visible:ring-4 peer-focus-visible:ring-ring/30 rounded-full">
          {checked && <span key={`r-${date}`} className="absolute inset-0 rounded-full bg-[hsl(var(--chart-2))] ripple" />}
          <span
            className={`relative w-8 h-8 rounded-full grid place-items-center border-2 transition-all duration-300 ${
              checked ? "bg-primary border-primary" : "border-input bg-card"
            } ${!canEdit ? "opacity-80" : ""}`}
          >
            {checked && <Check key={`c-${date}`} className="w-4 h-4 text-primary-foreground pop" strokeWidth={3} />}
          </span>
        </span>
        <span className="font-mono text-[15px] tabular-nums tracking-tight" data-testid={`text-date-${date}`}>{date}</span>
        <span className="text-sm text-muted-foreground">{weekday}</span>
        {isToday && <span className="text-[11px] font-medium uppercase tracking-wider text-accent-foreground bg-accent rounded-full px-2 py-0.5">Today</span>}
        {err && <span className="ml-auto text-xs text-destructive">Not saved</span>}
      </label>
    </li>
  );
}

export default function HabitPage({ user }: { user: User }) {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id > 0;
  const qc = useQueryClient();
  const habit = useGetHabit(id, { query: { enabled: valid, queryKey: getGetHabitQueryKey(id), refetchOnWindowFocus: true } });
  const comments = useListComments(id, {
    query: { enabled: valid && !!habit.data?.shared, queryKey: getListCommentsQueryKey(id), refetchInterval: 20000, refetchOnWindowFocus: true },
  });
  const post = usePostComment();
  const [text, setText] = useState("");
  const [postErr, setPostErr] = useState<string | null>(null);
  const days = lastSevenDays();

  if (!valid || habit.isError) {
    return (
      <div className="text-center py-16 rise">
        <p className="font-serif text-2xl">This habit is not available</p>
        <p className="text-muted-foreground mt-2 text-sm">It may be private, or the link is wrong.</p>
        <div className="mt-5 flex justify-center gap-4 text-sm">
          {valid && <button className="text-primary font-medium" onClick={() => habit.refetch()} data-testid="button-retry">Try again</button>}
          <Link href="/my-habits" className="text-primary font-medium" data-testid="link-back">Back to My habits</Link>
        </div>
      </div>
    );
  }

  if (habit.isLoading || !habit.data) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-2/3 rounded-xl bg-muted animate-pulse" />
        <div className="h-20 rounded-xl bg-muted animate-pulse" />
        <div className="h-72 rounded-3xl bg-muted animate-pulse" />
      </div>
    );
  }

  const h = habit.data;
  const isOwner = h.ownerId === user.id;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setPostErr(null);
    if (!text.trim()) return;
    post.mutate(
      { id, data: { text: text.trim() } },
      {
        onSuccess: () => {
          setText("");
          qc.invalidateQueries({ queryKey: getListCommentsQueryKey(id) });
          qc.invalidateQueries({ queryKey: getGetHabitQueryKey(id) });
          qc.invalidateQueries({ queryKey: getListCommunityQueryKey() });
          qc.invalidateQueries({ queryKey: getListHabitsQueryKey() });
        },
        onError: (err) => setPostErr(errorMessage(err)),
      },
    );
  };

  return (
    <div className="space-y-10">
      <Link href={isOwner ? "/my-habits" : "/community"} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back">
        <ArrowLeft className="w-4 h-4" /> {isOwner ? "My habits" : "Community"}
      </Link>

      <header className="rise">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span data-testid="text-owner">{isOwner ? "Your habit" : h.ownerName}</span>
          {isOwner && <SharedBadge shared={h.shared} id={h.id} />}
        </div>
        <h1 className="font-serif text-4xl mt-2" data-testid="text-habit-name">{h.name}</h1>
        <div className="mt-5 border-l-[3px] border-[hsl(var(--chart-2))] pl-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">When I do it</div>
          <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-line" data-testid="text-when-i-do-it">{h.whenIDoIt}</p>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 gap-3 rise">
        <div className="rounded-2xl bg-primary text-primary-foreground p-5">
          <div className="text-sm opacity-80">Days done:</div>
          <div className="font-serif text-4xl mt-1" data-testid="text-days-done">{h.daysDone}</div>
        </div>
        <div className="rounded-2xl bg-accent text-accent-foreground p-5">
          <div className="text-sm opacity-80">Current streak:</div>
          <div className="font-serif text-4xl mt-1" data-testid="text-current-streak">{h.currentStreak}</div>
        </div>
      </div>

      <section className="rounded-3xl bg-card border border-card-border p-5 md:p-6 rise">
        <div className="flex items-baseline justify-between px-1 mb-3">
          <h2 className="font-serif text-2xl">Last 7 days</h2>
          {!isOwner && <span className="text-xs text-muted-foreground">Only {h.ownerName} can tick these</span>}
        </div>
        <ul className="space-y-1">
          {days.map((d) => (
            <DayBox key={d.key} habit={h} date={d.key} weekday={d.weekday} isToday={d.isToday} canEdit={isOwner} />
          ))}
        </ul>
      </section>

      {h.shared && (
        <section className="space-y-5">
          <h2 className="font-serif text-2xl">Comments</h2>
          {comments.isLoading ? (
            <div className="h-16 rounded-2xl bg-muted animate-pulse" />
          ) : comments.isError ? (
            <p className="text-sm text-muted-foreground">
              Comments could not be loaded. <button className="text-primary" onClick={() => comments.refetch()} data-testid="button-retry-comments">Try again</button>
            </p>
          ) : !comments.data?.length ? (
            <p className="text-sm text-muted-foreground" data-testid="empty-comments">No comments yet. Ask a question or offer a thought.</p>
          ) : (
            <ul className="space-y-4">
              {comments.data.map((c) => (
                <li key={c.id} className="flex gap-3 rise" data-testid={`comment-${c.id}`}>
                  <span className="w-9 h-9 shrink-0 rounded-full bg-secondary text-secondary-foreground grid place-items-center text-xs font-semibold">{initials(c.authorName)}</span>
                  <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-card border border-card-border px-4 py-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold" data-testid={`text-comment-author-${c.id}`}>{c.authorName}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-[15px] mt-1 whitespace-pre-line break-words">{c.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={submit} className="space-y-3" data-testid="form-comment">
            <label className="block">
              <span className="text-sm font-medium">Comment</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={4000}
                data-testid="input-comment"
                className="mt-1.5 w-full min-h-24 rounded-xl border border-input bg-card px-4 py-3 text-[15px] outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20 resize-y"
              />
            </label>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={post.isPending || !text.trim()}
                data-testid="button-post-comment"
                className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 font-medium transition hover:brightness-110 active:scale-[.98] disabled:opacity-50"
              >
                {post.isPending ? "Posting..." : "Post comment"}
              </button>
              {postErr && <span className="text-sm text-destructive">{postErr}</span>}
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
