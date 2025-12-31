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

### Styling

- **Framework**: Tailwind CSS v4 with CSS variables
- **Component Variants**: Use `class-variance-authority` (cva) for variants
- **Utilities**: Use `cn()` from `@/lib/utils` for className merging
- **UI Library**: shadcn/ui components in `@/components/ui`
- **Icons**: lucide-react
- **Dark Mode**: Use `@/components/theme-provider` with next-themes

### State Management

- **Local State**: React hooks (useState, useReducer)
- **Global State**: Zustand via hooks in `hooks/` directory
- **Server State**: Fetch in Server Components, avoid unnecessary client fetching
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
  api/                 # API routes
  auth/                # Authentication pages
components/            # React components
  ui/                  # shadcn/ui components
actions/               # Server actions
lib/                   # Utility functions
types/                 # TypeScript types
hooks/                 # Custom React hooks
schema.ts              # Drizzle database schema
drizzle/               # Database migrations
```

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

### Documentation

- Add TSDoc comments for public functions and complex components
- Include usage examples in comments for complex hooks
- Document prop types with inline comments when not self-explanatory
