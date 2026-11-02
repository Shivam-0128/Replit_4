import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, habits, completions, comments, accounts } from "@workspace/db";
import {
  AddHabitBody, AddHabitResponse, ListHabitsResponse, ListCommunityResponse, GetHabitParams, GetHabitResponse,
  SetCompletionBody, SetCompletionParams, SetCompletionResponse,
  ListCommentsParams, ListCommentsResponse, PostCommentParams, PostCommentBody, PostCommentResponse,
} from "@workspace/api-zod";
import { requireAccount } from "../lib/auth";
import { loadHabits, visibleHabit } from "../lib/habits";

const router: IRouter = Router();
router.use(requireAccount);
router.get("/habits", async (req, res): Promise<void> => {
  res.json(ListHabitsResponse.parse(await loadHabits(eq(habits.ownerId, req.account!.id))));
});
router.get("/community", async (_req, res): Promise<void> => {
  res.json(ListCommunityResponse.parse(await loadHabits(eq(habits.shared, true))));
});
router.post("/habits", async (req, res): Promise<void> => {
  const parsed = AddHabitBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.name.trim() || !parsed.data.whenIDoIt.trim()) {
    res.status(400).json({ error: "Enter a habit name and describe when you do it." }); return;
  }
  const [row] = await db.insert(habits).values({ ownerId: req.account!.id, name: parsed.data.name.trim(),
    whenIDoIt: parsed.data.whenIDoIt.trim(), shared: parsed.data.shared }).returning();
  res.status(201).json(AddHabitResponse.parse(await visibleHabit(row.id, req.account!.id)));
});
router.get("/habits/:id", async (req, res): Promise<void> => {
  const params = GetHabitParams.safeParse(req.params);
  if (!params.success || params.data.id <= 0) { res.status(400).json({ error: "Invalid habit." }); return; }
  const habit = await visibleHabit(params.data.id, req.account!.id);
  if (!habit) { res.status(404).json({ error: "Habit not found." }); return; }
  res.json(GetHabitResponse.parse(habit));
});
router.put("/habits/:id/completion", async (req, res): Promise<void> => {
  const params = SetCompletionParams.safeParse(req.params);
  const parsed = SetCompletionBody.safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Invalid completion." }); return; }
  const habit = await visibleHabit(params.data.id, req.account!.id);
  if (!habit) { res.status(404).json({ error: "Habit not found." }); return; }
  if (habit.ownerId !== req.account!.id) { res.status(403).json({ error: "Only the habit owner can change completions." }); return; }
  const day = new Date(parsed.data.date + "T00:00:00Z");
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== parsed.data.date) {
    res.status(400).json({ error: "Enter a valid calendar date." }); return;
  }
  // Date labels are user's local calendar dates. Allow global timezone boundaries.
  const delta = day.getTime() - Date.now();
  if (delta > 36 * 3600000 || delta < -9 * 86400000) {
    res.status(400).json({ error: "Choose a date from the last seven days." }); return;
  }
  if (parsed.data.completed) {
    await db.insert(completions).values({ habitId: habit.id, date: parsed.data.date }).onConflictDoNothing();
  } else {
    await db.delete(completions).where(and(eq(completions.habitId, habit.id), eq(completions.date, parsed.data.date)));
  }
  res.json(SetCompletionResponse.parse(await visibleHabit(habit.id, req.account!.id)));
});
router.get("/habits/:id/comments", async (req, res): Promise<void> => {
  const params = ListCommentsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid habit." }); return; }
  const habit = await visibleHabit(params.data.id, req.account!.id);
  if (!habit) { res.status(404).json({ error: "Habit not found." }); return; }
  if (!habit.shared) { res.status(403).json({ error: "Discussion is available only on shared habits." }); return; }
  const rows = await db.select({ id: comments.id, habitId: comments.habitId, authorId: comments.authorId,
    authorName: accounts.displayName, text: comments.text, createdAt: comments.createdAt })
    .from(comments).innerJoin(accounts, eq(accounts.id, comments.authorId))
    .where(eq(comments.habitId, habit.id)).orderBy(asc(comments.createdAt), asc(comments.id));
  res.json(ListCommentsResponse.parse(rows.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))));
});
router.post("/habits/:id/comments", async (req, res): Promise<void> => {
  const params = PostCommentParams.safeParse(req.params);
  const parsed = PostCommentBody.safeParse(req.body);
  if (!params.success || !parsed.success || !parsed.data.text.trim()) {
    res.status(400).json({ error: "Write a comment before posting." }); return;
  }
  const habit = await visibleHabit(params.data.id, req.account!.id);
  if (!habit) { res.status(404).json({ error: "Habit not found." }); return; }
  if (!habit.shared) { res.status(403).json({ error: "Only shared habits can receive comments." }); return; }
  const [row] = await db.insert(comments).values({ habitId: habit.id, authorId: req.account!.id, text: parsed.data.text.trim() }).returning();
  res.status(201).json(PostCommentResponse.parse({ ...row, authorName: req.account!.displayName, createdAt: row.createdAt.toISOString() }));
});
export default router;
