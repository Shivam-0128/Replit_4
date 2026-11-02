import { pgTable, serial, text, integer, boolean, date, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { accounts } from "./accounts";

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  whenIDoIt: text("when_i_do_it").notNull(),
  shared: boolean("shared").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("habits_owner_idx").on(t.ownerId)]);

export const completions = pgTable("completions", {
  habitId: integer("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
}, (t) => [primaryKey({ columns: [t.habitId, t.date] })]);

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("comments_habit_idx").on(t.habitId)]);
