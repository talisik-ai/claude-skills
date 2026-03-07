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
// Correct — extend via className
<Button className="w-full bg-brand-500 hover:bg-brand-600">
  Submit
</Button>

// Correct — wrap with new defaults
export function PrimaryButton({ children, ...props }: ButtonProps) {
  return <Button variant="default" className="w-full" {...props}>{children}</Button>;
}

// Wrong — editing src/components/ui/button.tsx directly
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
// Use isError + error from useQuery
const { data, isError, error } = useQuery({ ... });

if (isError) {
  return <ErrorMessage message={error.message} />;
}

// Never wrap queryFn in try/catch and return null
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
    ui/                    <- shadcn components (CLI-managed, do not edit)
    [SharedComponent].tsx  <- app-wide shared components
  features/
    [feature-name]/
      components/          <- feature-specific components
      hooks/               <- feature-specific hooks
      [feature].types.ts   <- feature types
  hooks/                   <- app-wide custom hooks
  lib/
    api/                   <- API client functions
    utils/                 <- utility functions
  schemas/                 <- Zod schemas (shared)
  store/                   <- Zustand stores
  pages/ or app/           <- route components
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
// Correct use — child is expensive and parent re-renders often
const ExpensiveList = React.memo(({ items }: { items: Item[] }) => {
  return items.map(item => <Item key={item.id} {...item} />);
});

// Wrong — memoizing everything by default
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
