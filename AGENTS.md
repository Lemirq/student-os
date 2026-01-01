# AGENTS.md - Development Guidelines for Student OS

## Build & Development Commands

### Core Commands

- `bun install` - Install dependencies (use bun exclusively)
- `bun run dev` - Start development server (Next.js App Router)
- `bun run build` - Build production bundle
- `bun run start` - Start production server
- `bun run lint` - Run ESLint
- `bun run check-types` - Run TypeScript type checking

### Database Commands

- `bun run db:generate` - Generate Drizzle migrations from schema changes
- `bun run db:migrate` - Apply migrations to database

### Testing

- `bun run test:ai-tools` - Test AI tools integration
- No formal test framework (Jest/Vitest) configured yet - add before testing new features

### Pre-commit Hooks

- Husky is configured for pre-commit hooks
- lint-staged runs prettier on staged files automatically
- All commits trigger `prettier --write` on changed files

## Code Style Guidelines

### TypeScript Configuration

- Strict mode enabled in tsconfig.json
- Use explicit return types on all functions
- Prefer `type` over `interface` for object shapes (except when extending)
- Import types from drizzle: `import { InferSelectModel } from "drizzle-orm"`

### Import Organization

- Group imports in this order: external libraries, internal modules, relative imports
- Use `@/*` path aliases defined in tsconfig.json:
  - `@/components` - React components
  - `@/lib/utils` - Utility functions
  - `@/ui` - shadcn/ui components
  - `@/hooks` - Custom React hooks
  - `@/types` - TypeScript types
  - `@/actions` - Server actions
  - `@/utils/supabase` - Supabase utilities
  - `@/providers` - React context providers

### Component Architecture

- **Server Components** (default): No `'use client'` directive
- **Client Components**: Add `'use client'` only for event handlers, browser APIs, hooks
- **Functional Components**: Use arrow functions with explicit return type:
  ```typescript
  const Component = (): JSX.Element => {};
  ```
- **Props**: Use TypeScript interfaces or inline types, destructure props
- **File Naming**: kebab-case (e.g., `task-list.tsx`, `create-dialog.tsx`)

### Database & ORM

- **Primary**: Use Drizzle ORM exclusively for database operations
- **Fallback**: Only use Supabase client when Drizzle doesn't support a feature
- **Server Actions**: Use `"use server"` for data mutations in `actions/` directory
- **Schema**: All tables defined in `schema.ts` with proper relations
- **Types**: Infer types from schema using `InferSelectModel<typeof tableName>`
- **Validation**: Use Zod schemas for input validation in API routes and server actions

### API Routes & Data Fetching

- Use Route Handlers (`app/api/*/route.ts`) for external APIs
- Server Components: Use async/await for data fetching
- Loading states: Use `loading.tsx` files or React Suspense
- Error handling: Implement `error.tsx` files for error boundaries
- **TanStack Query**: Use for client-side caching with optimistic updates (see State Management)

### Styling

- **Framework**: Tailwind CSS v4 with CSS variables
- **Component Variants**: Use `class-variance-authority` (cva) for variants
- **Utilities**: Use `cn()` from `@/lib/utils` for className merging
- **UI Library**: shadcn/ui components in `@/components/ui`
- **Icons**: lucide-react
- **Dark Mode**: Use `@/components/theme-provider` with next-themes
- **Animations**: Use Framer Motion (`framer-motion/client`) for animations

### State Management

- **Local State**: React hooks (useState, useReducer)
- **Global State**: Zustand via hooks in `hooks/` directory (e.g., `use-command-store.ts`, `use-debt-store.ts`)
- **Server State**: TanStack Query for client-side caching
  - Use `lib/query-keys.ts` for centralized query key factory
  - Use `lib/query-utils.ts` for SSR prefetching utilities
  - Use `providers/query-provider.tsx` for React Query provider
- **Optimistic Updates**: Use mutation hooks in `hooks/use-task-mutations.ts`
- **Form State**: react-hook-form with Zod resolvers

### Error Handling

- Server Actions: Check authentication, throw errors with descriptive messages
- API Routes: Use try/catch, return proper HTTP status codes
- Client: Use Sonner toast for user-facing errors (`toast.error()`)
- Logging: `console.error()` for server-side errors

### Naming Conventions

- **Files**: kebab-case (e.g., `create-course-dialog.tsx`)
- **Components**: PascalCase (e.g., `CreateCourseDialog`)
- **Functions**: camelCase (e.g., `createCourse`, `getTasks`)
- **Types/Interfaces**: PascalCase (e.g., `Task`, `User`, `CreateTaskInput`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `DEFAULT_PAGE_SIZE`)
- **Database Tables**: snake_case (e.g., `grade_weights`, `is_current`)

### Performance & Best Practices

- Use `React.memo` strategically for expensive components
- Implement code splitting with `dynamic(() => import('./Component'))`
- Use proper loading states with `loading.tsx` or Suspense
- Optimize images and assets
- Use proper database indexing (add via migration scripts)
- Avoid unnecessary client components - default to Server Components
- **Caching**: Use `lib/redis-cache.ts` for server-side Redis caching (Upstash)
- **Query Caching**: TanStack Query with appropriate `staleTime` (e.g., 5min for AI context, 10min for sidebar)

### Security

- Never hardcode API keys or secrets
- Use environment variables with `.env.local` (gitignored)
- Server secrets: `process.env.VARIABLE_NAME` (not `NEXT_PUBLIC_`)
- Public env vars: `NEXT_PUBLIC_VARIABLE_NAME`
- Always validate user input with Zod schemas
- Check authentication in server actions and API routes

### Git Conventions

- Commit format: conventional commits (feat:, fix:, chore:, docs:, etc.)
- Branch names: `feat/description`, `fix/description`, `refactor/description`
- Pre-commit hooks run prettier automatically

### File Structure

```
app/                    # Next.js App Router pages
  (dashboard)/         # Dashboard route group
    courses/           # Course pages with [courseId] dynamic routes
    dashboard/         # Main dashboard
    schedule/          # Schedule calendar and management
    semesters/         # Semester management
    tasks/             # Task list with advanced views
  api/                 # API routes
    chat/              # AI chat endpoint (OpenRouter + Tavily)
    cron/              # Scheduled jobs (deadline checker)
  auth/                # Authentication callback
  login/               # Login page
  settings/            # User settings (appearance, notifications)
components/            # React components
  ai/                  # AI chat sidebar, history, syllabus preview
  courses/             # Course CRUD dialogs and page content
  dashboard/           # Dashboard widgets (grade gap, high stakes, heatmap, etc.)
  editor/              # Tiptap rich text editor
  grade-weights/       # Grade weight management forms
  insights/            # Analytics components (semester heatmap, study debt)
  landing/             # Landing page components (hero, features, footer, navbar)
  notifications/       # Push notification setup, iOS install prompt
  schedule/            # Schedule calendar, event dialogs, ICS upload
  semesters/           # Semester CRUD dialogs and content
  sidebar/             # App sidebar navigation
  tasks/               # Task views (list, board, calendar), modals, filters
  ui/                  # shadcn/ui components
actions/               # Server actions
  ai-context.ts        # AI context gathering
  chats.ts             # Chat history management
  courses.ts           # Course CRUD
  dashboard.ts         # Dashboard data fetching
  get-course-data.ts   # Course page data
  import-syllabus.ts   # Syllabus parsing
  notifications.ts     # Push subscription management
  page-context.ts      # Page context for AI
  schedule.ts          # Schedule events CRUD
  semesters.ts         # Semester CRUD
  sidebar.ts           # Sidebar data
  tasks.ts             # Task CRUD with optimistic updates
lib/                   # Utility functions
  course-matcher.ts    # Fuzzy matching for ICS course linking
  date-parser.ts       # Natural language date parsing (chrono-node)
  deadline-checker.ts  # Deadline notification logic
  env.ts               # Environment variable validation
  ics-parser.ts        # ICS file parsing (node-ical)
  query-keys.ts        # TanStack Query key factory
  query-utils.ts       # SSR prefetching utilities
  redis-cache.ts       # Upstash Redis caching helpers
  schedule-utils.ts    # Recurring event handling (RRULE, EXDATE)
  schemas.ts           # Zod validation schemas
  utils.ts             # General utilities (cn, etc.)
types/                 # TypeScript types
hooks/                 # Custom React hooks
  use-ai-context.ts    # AI context caching (5min TTL)
  use-command-store.ts # Command palette state (Zustand)
  use-course-query.ts  # Course data fetching
  use-debounce.ts      # Debounced values
  use-debt-store.ts    # Study debt state (Zustand)
  use-mobile.ts        # Mobile detection
  use-semester-query.ts# Semester data fetching
  use-sidebar-data.ts  # Sidebar caching (10min TTL)
  use-task-mutations.ts# Task mutations with optimistic updates
providers/             # React providers
  query-provider.tsx   # TanStack Query provider
schema.ts              # Drizzle database schema
drizzle/               # Database migrations
scripts/               # Utility scripts
  generate-icons.ts    # PWA icon generation
  test-deadline-checker.ts
  test-push-subscription.ts
public/                # Static assets
  sw.js                # Service worker for push notifications
```

### Key Libraries

- **AI**: OpenRouter API (GLM-4.7), Tavily for web search
- **Database**: Drizzle ORM, Supabase (PostgreSQL + Auth)
- **Caching**: TanStack Query (client), Upstash Redis (server)
- **Scheduling**: QStash for cron jobs, node-ical for ICS parsing
- **Calendar**: react-big-calendar for schedule view
- **Editor**: Tiptap for rich text editing
- **Date Parsing**: chrono-node for natural language dates
- **Notifications**: web-push with VAPID for push notifications
- **Drag & Drop**: @dnd-kit for task board and calendar
- **Animations**: Framer Motion

### Common Patterns

- **Server Action Pattern**:

  ```typescript
  "use server";
  import { db } from "@/drizzle";
  import { createClient } from "@/utils/supabase/server";

  export async function someAction(data: InputType) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    // ... database operations with Drizzle
  }
  ```

- **Component with cva Pattern**:

  ```typescript
  const componentVariants = cva("base-classes", {
    variants: { variant: { default: "...", secondary: "..." } }
  });
  const Component = ({ variant = "default", className, ...props }) => {
    return <div className={cn(componentVariants({ variant }), className)} {...props} />
  };
  ```

- **TanStack Query with Optimistic Updates**:

  ```typescript
  const mutation = useMutation({
    mutationFn: updateTask,
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      const previous = queryClient.getQueryData(queryKeys.tasks.all);
      queryClient.setQueryData(queryKeys.tasks.all, (old) => /* optimistic update */);
      return { previous };
    },
    onError: (err, newData, context) => {
      queryClient.setQueryData(queryKeys.tasks.all, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
  ```

- **Query Key Factory Pattern** (in `lib/query-keys.ts`):
  ```typescript
  export const queryKeys = {
    tasks: {
      all: ["tasks"] as const,
      detail: (id: string) => ["tasks", id] as const,
    },
    courses: {
      all: ["courses"] as const,
    },
  };
  ```

### Documentation

- Add TSDoc comments for public functions and complex components
- Include usage examples in comments for complex hooks
- Document prop types with inline comments when not self-explanatory
