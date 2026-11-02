import { and, desc, eq, inArray, or, type SQL } from "drizzle-orm";
import { db, habits, accounts, completions, comments } from "@workspace/db";

export function currentStreak(dates: string[]) {
  const ordered = [...new Set(dates)].sort().reverse();
  if (!ordered.length) return 0;
  let streak = 1;
  for (let i = 1; i < ordered.length; i++) {
    if (Date.parse(ordered[i - 1] + "T00:00:00Z") - Date.parse(ordered[i] + "T00:00:00Z") !== 86400000) break;
    streak++;
  }
  return streak;
}
export async function loadHabits(where: SQL) {
  const rows = await db.select({ habit: habits, ownerName: accounts.displayName }).from(habits)
    .innerJoin(accounts, eq(accounts.id, habits.ownerId)).where(where).orderBy(desc(habits.createdAt), desc(habits.id));
  if (!rows.length) return [];
  const ids = rows.map(({ habit }) => habit.id);
  const [ticks, posts] = await Promise.all([
    db.select().from(completions).where(inArray(completions.habitId, ids)),
    db.select({ habitId: comments.habitId }).from(comments).where(inArray(comments.habitId, ids)),
  ]);
  return rows.map(({ habit, ownerName }) => {
    const completedDates = ticks.filter((t) => t.habitId === habit.id).map((t) => t.date).sort();
    return { ...habit, ownerName, createdAt: habit.createdAt.toISOString(), completedDates,
      daysDone: completedDates.length, currentStreak: currentStreak(completedDates),
      commentCount: posts.filter((p) => p.habitId === habit.id).length };
  });
}
export async function visibleHabit(id: number, userId: number) {
  const [habit] = await loadHabits(and(eq(habits.id, id), or(eq(habits.ownerId, userId), eq(habits.shared, true)))!);
  return habit;
}
