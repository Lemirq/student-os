-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Users Policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Semesters Policies
CREATE POLICY "Users can view their own semesters" ON public.semesters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own semesters" ON public.semesters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own semesters" ON public.semesters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own semesters" ON public.semesters
  FOR DELETE USING (auth.uid() = user_id);

-- Courses Policies
-- We check ownership via the related semester's user_id
CREATE POLICY "Users can view their own courses" ON public.courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.semesters
      WHERE public.semesters.id = public.courses.semester_id
      AND public.semesters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own courses" ON public.courses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.semesters
      WHERE public.semesters.id = semester_id -- Note: use NEW.semester_id in triggers but in policy usually just column name refers to row being checked
      AND public.semesters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own courses" ON public.courses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.semesters
      WHERE public.semesters.id = public.courses.semester_id
      AND public.semesters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own courses" ON public.courses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.semesters
      WHERE public.semesters.id = public.courses.semester_id
      AND public.semesters.user_id = auth.uid()
    )
  );

-- Grade Weights Policies
-- Check ownership via course -> semester -> user
CREATE POLICY "Users can view their own grade weights" ON public.grade_weights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses
      JOIN public.semesters ON public.semesters.id = public.courses.semester_id
      WHERE public.courses.id = public.grade_weights.course_id
      AND public.semesters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own grade weights" ON public.grade_weights
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      JOIN public.semesters ON public.semesters.id = public.courses.semester_id
      WHERE public.courses.id = course_id
      AND public.semesters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own grade weights" ON public.grade_weights
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.courses
      JOIN public.semesters ON public.semesters.id = public.courses.semester_id
      WHERE public.courses.id = public.grade_weights.course_id
      AND public.semesters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own grade weights" ON public.grade_weights
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.courses
      JOIN public.semesters ON public.semesters.id = public.courses.semester_id
      WHERE public.courses.id = public.grade_weights.course_id
      AND public.semesters.user_id = auth.uid()
    )
  );

-- Tasks Policies
-- Check ownership via course -> semester -> user
CREATE POLICY "Users can view their own tasks" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses
      JOIN public.semesters ON public.semesters.id = public.courses.semester_id
      WHERE public.courses.id = public.tasks.course_id
      AND public.semesters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      JOIN public.semesters ON public.semesters.id = public.courses.semester_id
      WHERE public.courses.id = course_id
      AND public.semesters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own tasks" ON public.tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.courses
      JOIN public.semesters ON public.semesters.id = public.courses.semester_id
      WHERE public.courses.id = public.tasks.course_id
      AND public.semesters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own tasks" ON public.tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.courses
      JOIN public.semesters ON public.semesters.id = public.courses.semester_id
      WHERE public.courses.id = public.tasks.course_id
      AND public.semesters.user_id = auth.uid()
    )
  );

