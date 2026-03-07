# P2 Skills Design — fe-best-practices, be-best-practices

**Date:** 2026-03-07
**Status:** Approved
**Scope:** Create two new role skill SKILL.md files + registry entries

---

## Context

These two skills cover Step 5 of the workflow — developer implementation sessions. Unlike `coding-standards` (project-specific, FILL IN placeholders), these ship with real opinionated content for the team's actual stack. They auto-load in every dev session for their respective roles.

---

## Stack

**Frontend:** React + Tailwind + shadcn/ui + React Query
**Backend:** Node.js + Zod + Prisma + PostgreSQL + MongoDB + Redis

---

## Organization: By Concern (Approach B)

Both skills are organized by what a developer is trying to do, not by which tool they're using. This matches how AI-assisted sessions work — "how do I manage this state?" answers from one section, not scattered across tool sections.

---

## Skill 1: `fe-best-practices`

**File:** `packages/skills/fe-best-practices/SKILL.md`
**Category:** engineering
**Tags:** frontend, react, tailwind, shadcn, react-query, typescript, best-practices

### 8 Sections

**1. State Management**
- React Query for all server state — never useState to store fetched data
- useState/useReducer for local UI state only
- Zustand for global client state that persists across routes
- Clear rules on when each applies

**2. UI Components**
- shadcn/ui as the component base — extend, don't rewrite
- Install via CLI only (`npx shadcn@latest add [component]`), never copy-paste
- Tailwind utility classes only — no inline styles, no CSS modules, no styled-components
- Composition patterns: how to extend shadcn components correctly

**3. Forms**
- React Hook Form + Zod always paired — never one without the other
- Define Zod schema first, infer TypeScript type from it
- useForm with zodResolver, never manual validation
- Error display conventions

**4. Data Fetching**
- React Query patterns: queryKey conventions (array format, specificity)
- staleTime defaults, when to override
- useMutation + invalidateQueries for writes
- Optimistic updates pattern
- No direct fetch() in components

**5. Error Handling**
- Error boundaries at route level minimum
- React Query error states — use isError + error, not try/catch
- Toast notifications for user-facing errors (shadcn/ui Toast)
- Never swallow errors silently

**6. TypeScript**
- Explicit interface for every component's props — no inline object types
- Infer types from Zod schemas: `z.infer<typeof schema>`
- No `any` — use `unknown` + type guard if shape is truly unknown
- Return types on custom hooks

**7. File Structure**
- One component per file, file name = component name (PascalCase)
- Co-locate tests: `Button.tsx` → `Button.test.tsx` same directory
- `src/components/ui/` — shadcn components (do not edit these directly)
- `src/components/` — shared app components
- `src/features/[name]/components/` — feature-specific components
- `src/hooks/` — custom hooks
- `src/lib/` — utilities and config

**8. Performance**
- Don't memo by default — only when profiling shows a problem
- useCallback only for functions passed to memoized children
- Lazy load routes with React.lazy + Suspense
- Images through Next.js Image or optimized pipeline — never raw `<img>`

---

## Skill 2: `be-best-practices`

**File:** `packages/skills/be-best-practices/SKILL.md`
**Category:** engineering
**Tags:** backend, nodejs, zod, prisma, postgresql, mongodb, redis, typescript, best-practices

### 8 Sections

**1. Request Validation**
- Zod at every route entry point — validate before any business logic runs
- Define schemas in `src/schemas/` — reuse across routes and services
- Infer TypeScript types from Zod: `z.infer<typeof schema>`
- Return 400 with structured error on validation failure — never pass invalid data downstream

**2. Database — PostgreSQL (Prisma)**
- All DB access through repository classes — no Prisma calls in route handlers or services
- Select only fields needed: always use `select: {}` or `include: {}` explicitly
- Transactions for multi-step writes: `prisma.$transaction()`
- No raw SQL via `prisma.$queryRaw` unless absolutely necessary and documented

**3. Database — MongoDB**
- Mongoose schemas required — no schemaless writes
- Mirror Mongoose schema with a Zod schema for API validation
- Use lean() for read-only queries — avoids Mongoose overhead
- Index strategy documented per collection in context MD

**4. Caching — Redis**
- Cache-aside pattern: check Redis → miss → query DB → write to Redis
- Key naming convention: `[entity]:[id]:[field]` (e.g., `user:123:profile`)
- Always set TTL — no indefinite cache entries
- Invalidate on write: clear relevant keys after successful DB mutation
- Redis for sessions, rate limiting, pub/sub — not as a primary data store

**5. Error Handling**
- Structured error classes: `AppError(message, statusCode)`, `ValidationError`, `NotFoundError`
- Never throw raw strings or expose internal messages to API responses
- Central error middleware catches all errors — routes never handle errors directly
- Log full error internally, return generic message + error code to client
- HTTP status codes: 400 validation, 401 auth, 403 permission, 404 not found, 500 server

**6. API Design**
- Consistent response envelope: `{ data, error, meta }`
- REST resource naming: plural nouns, no verbs in URLs
- Pagination: cursor-based for large datasets, offset for small
- API versioning: `/v1/` prefix on all routes
- Never expose internal IDs directly — use public-facing slugs or UUIDs

**7. TypeScript**
- No `any` — `unknown` + type narrowing if shape is dynamic
- Infer types from Zod schemas at validation boundaries
- Typed repository return types — never return raw Prisma/Mongoose types to routes
- Strict null checks — handle undefined explicitly

**8. File Structure**
- `src/routes/` — one file per domain (users.router.ts, billing.router.ts)
- `src/services/` — business logic, orchestrates repositories
- `src/repositories/` — all DB access (Prisma + Mongoose + Redis)
- `src/schemas/` — Zod schemas, shared across routes and services
- `src/middleware/` — auth, error handling, rate limiting
- `src/lib/` — db clients, Redis client, utilities
- Routes → Services → Repositories: never skip a layer

---

## Files to Create

| File | Action |
|------|--------|
| `packages/skills/fe-best-practices/SKILL.md` | Create |
| `packages/skills/be-best-practices/SKILL.md` | Create |
| `registry.json` | Add 2 new entries |
