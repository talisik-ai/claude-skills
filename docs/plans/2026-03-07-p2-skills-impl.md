# P2 Skills Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create fe-best-practices and be-best-practices skill files with real opinionated content organized by concern, plus their registry entries.

**Architecture:** Two standalone SKILL.md files, each with 8 concern-based sections covering the team's actual stack. Tasks 1 and 2 are independent and run in parallel. Task 3 (registry) runs after both.

**Tech Stack:** Markdown, YAML frontmatter. Design doc: `docs/plans/2026-03-07-p2-skills-design.md`

---

### Task 1: fe-best-practices SKILL.md

**Files:**
- Create: `packages/skills/fe-best-practices/SKILL.md`

**Step 1: Create the file with this exact content**

```markdown
---
name: fe-best-practices
description: >
  Frontend best practices for React + Tailwind + shadcn/ui + React Query teams.
  Organized by concern: state management, UI components, forms, data fetching,
  error handling, TypeScript, file structure, and performance.
  Auto-loads in every frontend dev session.
triggers:
  - frontend
  - React
  - component
  - Tailwind
  - shadcn
  - React Query
  - fe best practices
---

# Frontend Best Practices

These are the frontend standards for this team's stack: React + Tailwind + shadcn/ui + React Query.
Apply these in every frontend dev session. When a developer asks "how should I do X?", answer from these practices first.

---

## 1. State Management

**Rule: match state type to the right tool.**

| State Type | Tool | Example |
|------------|------|---------|
| Server state (fetched from API) | React Query | User profile, product list |
| Local UI state (ephemeral) | useState / useReducer | Modal open, tab index |
| Global client state (cross-route) | Zustand | Auth user, cart, theme |

**Required:**
- Use React Query for anything fetched from an API — never `useState` to store server data
- Use Zustand for client state that persists across route changes
- Keep `useState` for local component state only (toggles, form field focus, etc.)

**Anti-patterns:**
- `const [users, setUsers] = useState([])` + `useEffect` to fetch — use React Query instead
- Prop-drilling global state more than 2 levels — use Zustand
- Storing derived data in state — compute from existing state/queries instead

---

## 2. UI Components

**Rule: use shadcn/ui as the base, extend via Tailwind, never rewrite.**

**Required:**
- Install shadcn components via CLI only:
  ```bash
  npx shadcn@latest add button
  npx shadcn@latest add dialog
  ```
- Never copy-paste shadcn source manually — always use the CLI
- Extend shadcn components with `className` + Tailwind — do not edit files in `src/components/ui/` directly
- Use Tailwind utility classes exclusively — no inline styles, no CSS modules, no styled-components

**Composition pattern — extending shadcn:**
```tsx
// ✅ Correct — extend via className
<Button className="w-full bg-brand-500 hover:bg-brand-600">
  Submit
</Button>

// ✅ Correct — wrap with new defaults
export function PrimaryButton({ children, ...props }: ButtonProps) {
  return <Button variant="default" className="w-full" {...props}>{children}</Button>;
}

// ❌ Wrong — editing src/components/ui/button.tsx directly
```

**Anti-patterns:**
- Editing files inside `src/components/ui/` — these are managed by shadcn CLI
- Writing custom CSS classes — use Tailwind utilities
- Using arbitrary values excessively: `w-[347px]` — prefer design tokens

---

## 3. Forms

**Rule: React Hook Form + Zod always paired. Never one without the other.**

**Required pattern:**
```tsx
// 1. Define schema first
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// 2. Infer type from schema — never define separately
type LoginFormData = z.infer<typeof loginSchema>;

// 3. Wire form with zodResolver
const form = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: '', password: '' },
});

// 4. Use FormField + shadcn Form components
<Form {...form}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormMessage /> {/* auto-renders Zod error */}
      </FormItem>
    )}
  />
</Form>
```

**Anti-patterns:**
- Manual `useState` for form fields — use React Hook Form
- Manual validation logic — define in Zod schema
- Defining TypeScript types separately from Zod schema — always `z.infer<>`
- Using `onSubmit` without `form.handleSubmit()` — bypasses validation

---

## 4. Data Fetching

**Rule: React Query owns all server state. Never fetch in useEffect.**

**Query key conventions:**
```tsx
// Use array format, most general → most specific
['users']                          // all users
['users', userId]                  // specific user
['users', userId, 'posts']         // user's posts
['users', userId, 'posts', postId] // specific post
```

**Required patterns:**
```tsx
// Fetching
const { data, isLoading, isError, error } = useQuery({
  queryKey: ['users', userId],
  queryFn: () => api.users.get(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes default
});

// Mutations — always invalidate on success
const { mutate, isPending } = useMutation({
  mutationFn: (data: UpdateUserData) => api.users.update(userId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users', userId] });
  },
});

// Optimistic update
const { mutate } = useMutation({
  mutationFn: updateUser,
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['users', userId] });
    const previous = queryClient.getQueryData(['users', userId]);
    queryClient.setQueryData(['users', userId], newData);
    return { previous };
  },
  onError: (_, __, context) => {
    queryClient.setQueryData(['users', userId], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['users', userId] });
  },
});
```

**Anti-patterns:**
- `useEffect(() => { fetch(url).then(...) }, [])` — use useQuery
- `refetchInterval` without good reason — prefer invalidation
- Ignoring `isLoading` / `isError` states in the UI

---

## 5. Error Handling

**Rule: handle errors at the right layer — don't swallow, don't over-catch.**

**Error boundaries (required at route level minimum):**
```tsx
// Wrap each route in an error boundary
<ErrorBoundary fallback={<ErrorPage />}>
  <Route path="/dashboard" element={<Dashboard />} />
</ErrorBoundary>
```

**React Query error states:**
```tsx
// ✅ Use isError + error from useQuery
const { data, isError, error } = useQuery({ ... });

if (isError) {
  return <ErrorMessage message={error.message} />;
}

// ❌ Never wrap queryFn in try/catch and return null
```

**User-facing errors — use shadcn Toast:**
```tsx
const { toast } = useToast();

mutate(data, {
  onError: (error) => {
    toast({
      variant: 'destructive',
      title: 'Something went wrong',
      description: error.message,
    });
  },
});
```

**Anti-patterns:**
- Empty catch blocks: `catch (e) {}`
- `console.error` only — always surface to user or error boundary
- try/catch inside React Query's `queryFn` — let React Query handle it

---

## 6. TypeScript

**Rule: be explicit. Let Zod generate types. No `any`.**

**Required:**
```tsx
// Explicit props interface — no inline object types
interface UserCardProps {
  userId: string;
  onSelect: (userId: string) => void;
  isSelected?: boolean;
}

// Infer from Zod — never define separately
const userSchema = z.object({ id: z.string(), name: z.string() });
type User = z.infer<typeof userSchema>;

// Return type on custom hooks
function useSelectedUser(): { user: User | null; select: (id: string) => void } {
  ...
}

// unknown + type guard instead of any
function parseResponse(data: unknown): User {
  return userSchema.parse(data); // Zod throws on invalid
}
```

**Anti-patterns:**
- `any` — use `unknown` + Zod parse or type guard
- Duplicate type definitions that mirror a Zod schema
- Implicit return types on exported functions and hooks
- `as SomeType` casting without validation

---

## 7. File Structure

```
src/
  components/
    ui/                    ← shadcn components (CLI-managed, do not edit)
    [SharedComponent].tsx  ← app-wide shared components
  features/
    [feature-name]/
      components/          ← feature-specific components
      hooks/               ← feature-specific hooks
      [feature].types.ts   ← feature types
  hooks/                   ← app-wide custom hooks
  lib/
    api/                   ← API client functions
    utils/                 ← utility functions
  schemas/                 ← Zod schemas (shared)
  store/                   ← Zustand stores
  pages/ or app/           ← route components
```

**Rules:**
- One component per file — file name matches component name (PascalCase)
- Co-locate tests: `UserCard.tsx` → `UserCard.test.tsx` in same directory
- Never import from `src/components/ui/` and modify — extend via wrapper
- Zustand stores: one file per domain (`auth.store.ts`, `cart.store.ts`)

---

## 8. Performance

**Rule: don't optimize prematurely. Measure first.**

**Lazy load routes (always):**
```tsx
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

<Suspense fallback={<PageLoader />}>
  <Dashboard />
</Suspense>
```

**memo and useCallback — only when profiling shows a problem:**
```tsx
// ✅ Correct use — child is expensive and parent re-renders often
const ExpensiveList = React.memo(({ items }: { items: Item[] }) => {
  return items.map(item => <Item key={item.id} {...item} />);
});

// ❌ Wrong — memoizing everything by default
const SimpleLabel = React.memo(({ text }: { text: string }) => <span>{text}</span>);
```

**Images:**
- Never raw `<img>` for app images — use Next.js `<Image>` or the project's image component
- Always specify `width` and `height` to prevent layout shift
- Use `loading="lazy"` for below-the-fold images

**Anti-patterns:**
- Wrapping every component in `React.memo` "just in case"
- `useCallback` on every function — only for functions passed to memoized children
- Fetching data in `useEffect` — React Query handles caching and deduplication

---

## Behavior Rules

- **Answer from these practices first** — when a dev asks about patterns, check here before responding
- **Flag deviations** — if asked to implement something that contradicts these practices, flag it: "This goes against fe-best-practices — here's the correct pattern"
- **shadcn first** — always check if shadcn has a component before suggesting a custom implementation
- **Zod schemas before types** — whenever a type is needed, ask if there's a Zod schema it should be inferred from
- **Performance last** — don't suggest memoization unless asked or profiling data justifies it
```

**Step 2: Verify the file has all 8 sections**

Check for: State Management, UI Components, Forms, Data Fetching, Error Handling, TypeScript, File Structure, Performance, and Behavior Rules.

**Step 3: Commit**

```bash
git add packages/skills/fe-best-practices/SKILL.md
git commit -m "feat: add fe-best-practices skill (React + Tailwind + shadcn + React Query)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: be-best-practices SKILL.md

**Files:**
- Create: `packages/skills/be-best-practices/SKILL.md`

**Step 1: Create the file with this exact content**

```markdown
---
name: be-best-practices
description: >
  Backend best practices for Node.js + Zod + Prisma + PostgreSQL + MongoDB + Redis teams.
  Organized by concern: request validation, PostgreSQL/Prisma patterns, MongoDB patterns,
  Redis caching, error handling, API design, TypeScript, and file structure.
  Auto-loads in every backend dev session.
triggers:
  - backend
  - Node.js
  - API
  - Prisma
  - PostgreSQL
  - MongoDB
  - Redis
  - Zod
  - be best practices
---

# Backend Best Practices

These are the backend standards for this team's stack: Node.js + Zod + Prisma + PostgreSQL + MongoDB + Redis.
Apply these in every backend dev session. When a developer asks "how should I do X?", answer from these practices first.

---

## 1. Request Validation

**Rule: Zod at every route entry point. Validate before any business logic runs.**

**Required pattern:**
```typescript
// Define schema in src/schemas/
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'user', 'viewer']),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// Validate at route handler — before service call
router.post('/users', async (req, res, next) => {
  const result = createUserSchema.safeParse(req.body);

  if (!result.success) {
    return next(new ValidationError(result.error.flatten()));
  }

  const user = await userService.create(result.data); // typed as CreateUserInput
  res.status(201).json({ data: user });
});
```

**Anti-patterns:**
- Passing `req.body` directly to services without validation
- Defining TypeScript types separately from Zod schemas — always `z.infer<>`
- Using `.parse()` in route handlers — use `.safeParse()` and handle errors explicitly
- Validating inside the service layer — validate at the route, trust data downstream

---

## 2. Database — PostgreSQL (Prisma)

**Rule: all DB access through repository classes. Prisma never called in routes or services.**

**Repository pattern:**
```typescript
// src/repositories/user.repository.ts
export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {        // always select explicitly — never return *
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
  }

  async create(data: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data,
      select: { id: true, email: true, name: true, createdAt: true },
    });
  }
}
```

**Transactions:**
```typescript
// Multi-step writes always use transactions
async transferCredits(fromId: string, toId: string, amount: number) {
  return this.prisma.$transaction(async (tx) => {
    await tx.wallet.update({ where: { userId: fromId }, data: { balance: { decrement: amount } } });
    await tx.wallet.update({ where: { userId: toId }, data: { balance: { increment: amount } } });
  });
}
```

**Anti-patterns:**
- `prisma.user.findMany()` without `select` — always specify fields
- Prisma calls in route handlers or service files
- `prisma.$queryRaw` without a documented reason
- N+1 queries — use `include` or batch with `findMany({ where: { id: { in: ids } } })`

---

## 3. Database — MongoDB

**Rule: Mongoose schemas required. No schemaless writes. Mirror with Zod.**

**Schema setup:**
```typescript
// src/models/product.model.ts
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 200 },
  price: { type: Number, required: true, min: 0 },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  metadata: { type: Map, of: String }, // typed even for flexible fields
}, { timestamps: true });

export const Product = mongoose.model('Product', productSchema);

// Mirror with Zod for API validation
export const productInputSchema = z.object({
  name: z.string().max(200),
  price: z.number().min(0),
  categoryId: z.string(),
  metadata: z.record(z.string()).optional(),
});
```

**Read patterns:**
```typescript
// Use lean() for read-only queries — skips Mongoose document overhead
const products = await Product.find({ categoryId }).lean();

// Projection — only return needed fields
const names = await Product.find({}).select('name price').lean();
```

**Anti-patterns:**
- Writing to MongoDB without a Mongoose schema
- Storing arbitrary JSON blobs — define the shape in the schema
- Using `.find()` without `.lean()` for read-only operations
- No indexes — define indexes in schema for all queried fields

---

## 4. Caching — Redis

**Rule: cache-aside pattern. Always set TTL. Invalidate on write.**

**Cache-aside pattern:**
```typescript
// src/repositories/user.repository.ts
async findById(id: string): Promise<User | null> {
  const cacheKey = `user:${id}:profile`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Cache miss — query DB
  const user = await this.prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });

  // 3. Write to cache with TTL
  if (user) {
    await redis.setex(cacheKey, 3600, JSON.stringify(user)); // 1 hour TTL
  }

  return user;
}

// Invalidate on write
async update(id: string, data: UpdateUserInput): Promise<User> {
  const user = await this.prisma.user.update({ where: { id }, data });
  await redis.del(`user:${id}:profile`); // clear cache on update
  return user;
}
```

**Key naming convention:**
```
[entity]:[id]:[scope]
user:123:profile
user:123:permissions
session:abc-xyz
rate-limit:ip:192.168.1.1
```

**Anti-patterns:**
- Redis keys without TTL — always use `setex` or `expire`
- Using Redis as primary data store — it's a cache, not a database
- Not invalidating cache on mutations — leads to stale data
- Storing large objects in Redis — keep values small, store IDs not full documents

**Redis use cases:**
- Session storage
- Rate limiting
- Pub/sub for real-time events
- Distributed locks
- Short-lived tokens (email verification, password reset)

---

## 5. Error Handling

**Rule: structured error classes, central middleware, never expose internals.**

**Error class setup:**
```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(public details: unknown) {
    super('Validation failed', 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super('Unauthorized', 401, 'UNAUTHORIZED');
  }
}
```

**Central error middleware (Express):**
```typescript
// src/middleware/error.middleware.ts
export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  logger.error({ err, path: req.path, method: req.method }); // full error logged internally

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  // Unknown error — never expose details
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}
```

**HTTP status codes:**
| Code | When |
|------|------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error / bad request |
| 401 | Not authenticated |
| 403 | Authenticated but not permitted |
| 404 | Resource not found |
| 409 | Conflict (duplicate, state mismatch) |
| 422 | Unprocessable (semantic validation) |
| 500 | Unhandled server error |

**Anti-patterns:**
- `throw new Error('User not found')` — use `NotFoundError('User')`
- Returning error details from 500 responses — log internally, return generic message
- try/catch in every function — only catch what you can handle, let the rest bubble to middleware
- `res.status(200).json({ success: false, error: '...' })` — use correct HTTP status codes

---

## 6. API Design

**Rule: consistent response shape, REST conventions, always versioned.**

**Response envelope:**
```typescript
// Success
{ "data": { ... }, "meta": { "page": 1, "total": 42 } }

// Error (handled by error middleware)
{ "error": { "code": "NOT_FOUND", "message": "User not found" } }

// Collection
{ "data": [...], "meta": { "page": 1, "limit": 20, "total": 100, "cursor": "abc" } }
```

**REST conventions:**
```
GET    /v1/users           — list users
POST   /v1/users           — create user
GET    /v1/users/:id       — get user
PATCH  /v1/users/:id       — partial update
DELETE /v1/users/:id       — delete
GET    /v1/users/:id/posts — nested resource
```

**Pagination:**
- Cursor-based for large / real-time datasets
- Offset (`page` + `limit`) for small, stable datasets only
- Always return `total` count in `meta`
- Default limit: 20, max limit: 100

**Anti-patterns:**
- Verbs in URLs: `/getUser`, `/createPost` — use HTTP methods
- Inconsistent response shapes between endpoints
- No versioning: `/users` — always `/v1/users`
- Exposing database IDs directly — use UUIDs or public-facing slugs

---

## 7. TypeScript

**Rule: strict types everywhere. Zod generates types. No `any`.**

**Required:**
```typescript
// Infer from Zod — never define separately
const createUserSchema = z.object({ email: z.string().email() });
type CreateUserInput = z.infer<typeof createUserSchema>; // ✅

// Typed repository returns — never raw Prisma types to callers
interface UserRepository {
  findById(id: string): Promise<UserDTO | null>;
  create(data: CreateUserInput): Promise<UserDTO>;
}

// unknown + parse instead of any
function handleWebhook(payload: unknown): WebhookEvent {
  return webhookEventSchema.parse(payload); // throws on invalid
}
```

**Anti-patterns:**
- `any` — use `unknown` + Zod or type guards
- Returning raw Prisma models from repositories — define DTOs
- Casting with `as SomeType` without validation
- Implicit `any` in catch blocks: `catch (e)` → use `catch (e: unknown)`

---

## 8. File Structure

```
src/
  routes/
    users.router.ts         ← one file per domain
    billing.router.ts
  services/
    user.service.ts         ← business logic, orchestrates repositories
    billing.service.ts
  repositories/
    user.repository.ts      ← Prisma queries
    product.repository.ts   ← Mongoose queries
    cache.repository.ts     ← Redis operations
  schemas/
    user.schema.ts          ← Zod schemas (shared across routes + services)
    billing.schema.ts
  models/
    product.model.ts        ← Mongoose models
  middleware/
    auth.middleware.ts
    error.middleware.ts
    rate-limit.middleware.ts
  lib/
    prisma.ts               ← Prisma client singleton
    mongoose.ts             ← Mongoose connection
    redis.ts                ← Redis client singleton
    errors.ts               ← AppError classes
    logger.ts               ← structured logger
```

**Layer rules (never skip):**
```
Route handler → Service → Repository → Database
     ↑               ↑           ↑
  Validation    Business      Data access
   (Zod)         logic         only here
```

- Routes call services — never repositories directly
- Services call repositories — never Prisma/Mongoose directly
- Repositories return DTOs — never raw DB objects to callers
- Schemas (`src/schemas/`) shared between routes and services — single source of truth

---

## Behavior Rules

- **Answer from these practices first** — when a dev asks about patterns, check here before responding
- **Flag deviations** — if asked to implement something that contradicts these practices, flag it: "This goes against be-best-practices — here's the correct pattern"
- **Repository layer always** — whenever a dev accesses the DB directly in a route or service, flag it
- **Zod schemas before types** — whenever a type is needed, ask if there's a Zod schema it should be inferred from
- **Error classes over raw throws** — always suggest the appropriate AppError subclass
- **Cache invalidation reminder** — whenever a mutation is written, remind about cache invalidation if Redis is in use
```

**Step 2: Verify the file has all 8 sections**

Check for: Request Validation, Database — PostgreSQL (Prisma), Database — MongoDB, Caching — Redis, Error Handling, API Design, TypeScript, File Structure, and Behavior Rules.

**Step 3: Commit**

```bash
git add packages/skills/be-best-practices/SKILL.md
git commit -m "feat: add be-best-practices skill (Node + Zod + Prisma + PostgreSQL + MongoDB + Redis)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Add 2 entries to registry.json

**Files:**
- Modify: `registry.json`

**Step 1: Read registry.json**

**Step 2: Append these two entries to the skills array**

```json
{
  "name": "fe-best-practices",
  "displayName": "Frontend Best Practices",
  "version": "1.0.0",
  "description": "Frontend best practices for React + Tailwind + shadcn/ui + React Query. Organized by concern: state management, UI components, forms, data fetching, error handling, TypeScript, file structure, and performance. Auto-loads in every frontend dev session.",
  "author": "talisik-ai",
  "category": "engineering",
  "tags": ["frontend", "react", "tailwind", "shadcn", "react-query", "typescript", "best-practices"],
  "path": "packages/skills/fe-best-practices",
  "installSize": "16kb",
  "requiresTools": [],
  "readme": "https://github.com/talisik-ai/claude-skills/tree/main/packages/skills/fe-best-practices"
},
{
  "name": "be-best-practices",
  "displayName": "Backend Best Practices",
  "version": "1.0.0",
  "description": "Backend best practices for Node.js + Zod + Prisma + PostgreSQL + MongoDB + Redis. Organized by concern: request validation, Prisma patterns, MongoDB patterns, Redis caching, error handling, API design, TypeScript, and file structure. Auto-loads in every backend dev session.",
  "author": "talisik-ai",
  "category": "engineering",
  "tags": ["backend", "nodejs", "zod", "prisma", "postgresql", "mongodb", "redis", "typescript", "best-practices"],
  "path": "packages/skills/be-best-practices",
  "installSize": "18kb",
  "requiresTools": [],
  "readme": "https://github.com/talisik-ai/claude-skills/tree/main/packages/skills/be-best-practices"
}
```

**Step 3: Validate JSON**

Run: `node -e "require('./registry.json'); console.log('valid')"`
Expected: `valid`

**Step 4: Commit**

```bash
git add registry.json
git commit -m "chore: add fe-best-practices and be-best-practices to registry

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
