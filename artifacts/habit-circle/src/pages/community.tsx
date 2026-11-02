import { Link } from "wouter";
import { useListCommunity, getListCommunityQueryKey } from "@workspace/api-client-react";
import { MessageCircle } from "lucide-react";
import { initials } from "@/lib/habit-utils";
import { ListSkeleton } from "@/pages/my-habits";

export default function Community() {
  const q = useListCommunity({ query: { queryKey: getListCommunityQueryKey(), refetchInterval: 30000, refetchOnWindowFocus: true, refetchOnMount: "always" } });

  return (
    <div className="space-y-10">
      <header className="rise">
        <p className="text-sm text-muted-foreground">Habits members chose to share.</p>
        <h1 className="font-serif text-4xl mt-1">Community</h1>
      </header>
      {q.isLoading ? (
        <ListSkeleton />
      ) : q.isError ? (
        <div className="rounded-2xl border border-border p-6 text-center">
          <p className="text-muted-foreground">The community could not be loaded.</p>
          <button onClick={() => q.refetch()} className="mt-3 text-primary font-medium" data-testid="button-retry">Try again</button>
        </div>
      ) : !q.data?.length ? (
        <div className="rounded-3xl border-2 border-dashed border-border p-10 text-center" data-testid="empty-community">
          <p className="font-serif text-xl">The circle is quiet for now</p>
          <p className="text-sm text-muted-foreground mt-1">When someone shares a habit, it will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {q.data.map((h, i) => (
            <li key={h.id} style={{ animationDelay: `${i * 50}ms` }} className="rise rounded-2xl bg-card border border-card-border p-6" data-testid={`card-community-${h.id}`}>
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <span className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground grid place-items-center text-[11px] font-semibold">{initials(h.ownerName)}</span>
                <span data-testid={`text-owner-${h.id}`}>{h.ownerName}</span>
              </div>
              <Link href={`/habits/${h.id}`} className="block font-serif text-xl mt-3 hover:text-primary underline-offset-4 hover:underline" data-testid={`link-habit-${h.id}`}>
                {h.name}
              </Link>
              <p className="text-[15px] text-muted-foreground mt-1.5 whitespace-pre-line">{h.whenIDoIt}</p>
              <div className="mt-4 flex items-center gap-5 text-sm">
                <span data-testid={`text-days-done-${h.id}`}>
                  Days done: <strong className="font-semibold text-primary">{h.daysDone}</strong>
                </span>
                <Link href={`/habits/${h.id}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground" data-testid={`link-comments-${h.id}`}>
                  <MessageCircle className="w-4 h-4" /> {h.commentCount}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
