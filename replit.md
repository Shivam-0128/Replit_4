# Habit Circle

Private and shared daily habit tracking for friends and colleagues, with progress and discussions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (managed workflow supplies the port)
- `pnpm --filter @workspace/habit-circle run dev` — frontend (managed workflow supplies port and base path)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/habit-circle` — React frontend.
- `artifacts/api-server/src/routes` — account, habit, completion, and comment APIs.
- `lib/api-spec/openapi.yaml` — API contract; rerun codegen after changes.
- `lib/db/src/schema` — PostgreSQL schema.

## Architecture decisions

- Immediate email/password sign-up without email confirmation preserves the requested flow.
- Streaks count backwards from the latest completed date, not necessarily today.
- New accounts start empty; no demo accounts or fabricated personal habits.

## Product

Sign up/in/out, add private or shared habits, tick the last seven local calendar days, view total completed days and streaks, and discuss shared habits with attributed comments. Data persists in PostgreSQL across devices.

## User preferences

Keep the application simple and easy to use. Do not add unrequested functions.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
