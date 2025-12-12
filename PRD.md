# **Project Name: StudentOS**

**Goal:** Build a high-performance student management platform that combines the speed of Linear, the flexibility of Notion, and the intelligence of an AI Agent.

## **1. Tech Stack & Standards**

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **ORM/Query:** Supabase JS Client (Direct) + React Query (TanStack Query) for state management.
- **AI:** Vercel AI SDK (`bun i ai`) + gemini 2.5 flash
- **UI Library:** Shadcn/ui + Radix UI.
- **Styling:** Tailwind CSS.
- **Drag & Drop:** `@dnd-kit/core`
- **Date Handling:** `date-fns`

---

## **2. Database Schema (Reference)**

_The AI Agent must be aware of this schema to write correct queries._

- **`semesters`**: `id`, `user_id`, `name` (Fall 2025), `year_level` (1), `start_date`, `end_date`, `is_current`.
- **`courses`**: `id`, `semester_id`, `code` (CSC148), `name`, `color`, `goal_grade`.
- **`grade_weights`**: `id`, `course_id`, `name` (Assignments, Midterm), `weight_percent`.
- **`tasks`**: `id`, `course_id`, `grade_weight_id`, `title`, `status` (Todo, In Progress, Done), `priority` (Low, Medium, High), `do_date` (Start), `due_date` (Deadline), `score_received`, `score_max`.
- **`users`**: `id`, `email`, `full_name`, `avatar_url`, `created_at`, `updated_at`

---

## **3. Development Phases**

### **Phase 1: Foundation & Authentication**

**Objective:** Set up the repo, database connection, and user authentication.

**Instructions for Cursor:**

1.  Initialize a Next.js 15 app with TypeScript, Tailwind, and ESLint.
2.  Install Shadcn/ui and initialize it. Add `Button`, `Input`, `Card`, `Form` components.
3.  Set up Supabase SSR (Server Side Rendering) client following the official Next.js guide.
4.  Create a layout wrapper that enforces Authentication (redirect to `/login` if no session).
5.  Create a "Settings" page where the user can view their current user ID (for debugging).

**Acceptance Criteria:**

- User can sign up/login via Google oauth (already setup in supabase).
- Database connection is verified.
- Protected routes redirect unauthenticated users.

---

### **Phase 2: Core Course & Task Management (The "Linear" Feel)**

**Objective:** Build the manual CRUD interfaces with a focus on keyboard-first design.

**Instructions for Cursor:**

1.  **Sidebar:** Create a collapsible sidebar listing `Semesters` > `Courses`.
2.  **Course Page:**
    - Create a Server Action to add a Course.
    - Create a UI to add `Grade Weights` (categories) dynamically to a course.
3.  **Task List View (The "Linear" View):**
    - Use `@tanstack/react-table` for a high-performance list.
    - Columns: Title, Course (colored badge), Status, Priority, Do Date, Due Date.
    - **Grouping:** Allow grouping by "Course" or "Due Date".
4.  **Task Creation Modal:**
    - `Cmd+C` shortcut opens a modal to create a task.
    - Fields: Title, Course (Select), Category (Select based on Course), Do Date, Due Date.

**Acceptance Criteria:**

- Can create a Semester, Course, and custom Grade Categories.
- Can create a Task linked to a specific Grade Category.
- List view renders fast.

---

### **Phase 3: The Grade Calculator & Kanban**

**Objective:** Visualizing the data and handling the math.

**Instructions for Cursor:**

1.  **Kanban Board:**
    - Implement `@dnd-kit`.
    - Columns map to Task `status` (Todo, In Progress, Done).
    - Drag-and-drop triggers a `useMutation` to update Supabase immediately (Optimistic UI).
2.  **Grade Calculation Utility:**
    - Write a utility function `calculateGrade(courseId)` that fetches all tasks for a course.
    - Formula: `Sum(score_received / score_max * weight_percent)` for all completed tasks.
    - Calculate "Max Possible Grade" (assuming 100% on remaining tasks).
3.  **Dashboard UI:**
    - Show a progress bar per course.
    - Visual: Current Grade vs. Goal Grade.

**Acceptance Criteria:**

- Dragging a card updates its status in the DB.
- Entering a score of 80/100 on a task updates the Course Grade instantly.

---

### **Phase 4: The AI Agent (The "Brain")**

**Objective:** Vercel AI SDK integration for "Text-to-Action".

**Instructions for Cursor:**

1.  **Setup AI SDK:**
    - Create `app/api/chat/route.ts`.
    - Implement `streamText` from `ai`.
2.  **Define Tools (Function Calling):**
    - `create_task`: Arguments `{ title, course_code, due_date }`. Performs SQL insert.
    - `update_grade`: Arguments `{ task_title, score }`. Performs SQL update.
    - `get_schedule`: Arguments `{ date }`. specific SQL select.
    - `ingest_syllabus`: Argument `{ full_text }`. Parses text and batch inserts `grade_weights` and `tasks`.
3.  **Chat UI:**
    - Floating "Cmd+J" or "Cmd+K" modal (like Notion AI).
    - Chat interface that renders "Tool Results" (e.g., "I've added 4 assignments to CSC148").

**Acceptance Criteria:**

- User can type: "I got 90 on my midterms" -> DB updates.
- User can paste a syllabus -> AI creates the rows in `grade_weights`.

---

### **Phase 5: Polish & Shortcuts**

**Objective:** "Linear-like" speed.

**Instructions for Cursor:**

1.  **Global Shortcuts:** Implement `react-hotkeys-hook`.
    - `C` -> Create Task.
    - `G` then `T` -> Go to Tasks.
    - `G` then `C` -> Go to Courses.
2.  **Optimistic Updates:** Ensure all mutations (checkboxes, drag and drop) update UI instantly before server confirms.
