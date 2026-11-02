import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, accounts } from "@workspace/db";
import { SignUpBody, SignInBody, GetMeResponse, SignUpResponse, SignInResponse } from "@workspace/api-zod";
import { publicUser, hashPassword, verifyPassword, startSession, endSession, requireAccount, limitAuth } from "../lib/auth";

const router: IRouter = Router();
router.get("/auth/me", requireAccount, (req, res) => {
  res.json(GetMeResponse.parse(publicUser(req.account!)));
});
router.post("/auth/signup", limitAuth, async (req, res): Promise<void> => {
  const parsed = SignUpBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Enter a display name, valid email, and password of 8–128 characters." }); return; }
  const displayName = parsed.data.displayName.trim();
  if (!displayName) { res.status(400).json({ error: "Display name cannot be blank." }); return; }
  const email = parsed.data.email.trim().toLowerCase();
  const passwordHash = await hashPassword(parsed.data.password);
  const [account] = await db.insert(accounts).values({ displayName, email, passwordHash })
    .onConflictDoNothing({ target: accounts.email }).returning();
  if (!account) { res.status(409).json({ error: "This email already has an account. Please sign in." }); return; }
  await startSession(req, res, account.id);
  res.status(201).json(SignUpResponse.parse(publicUser(account)));
});
router.post("/auth/signin", limitAuth, async (req, res): Promise<void> => {
  const parsed = SignInBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Enter your email and password." }); return; }
  const [account] = await db.select().from(accounts).where(eq(accounts.email, parsed.data.email.trim().toLowerCase()));
  // Run scrypt even for unknown accounts to reduce account timing leaks.
  const valid = await verifyPassword(parsed.data.password, account?.passwordHash ?? `${"0".repeat(32)}:${"0".repeat(128)}`);
  if (!account || !valid) { res.status(401).json({ error: "Email or password is incorrect." }); return; }
  await startSession(req, res, account.id);
  res.json(SignInResponse.parse(publicUser(account)));
});
router.post("/auth/signout", async (req, res): Promise<void> => {
  await endSession(req, res);
  res.sendStatus(204);
});
export default router;
