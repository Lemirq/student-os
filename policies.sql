ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_events ENABLE ROW LEVEL SECURITY;

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

-- Chats Policies
CREATE POLICY "Users can view their own chats" ON public.chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats" ON public.chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats" ON public.chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats" ON public.chats
  FOR DELETE USING (auth.uid() = user_id);

-- Push Subscriptions Policies
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own push subscriptions" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push subscriptions" ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Sent Notifications Policies
-- Note: Users can view/delete their own, but inserts are done server-side via service role
ALTER TABLE public.sent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sent notifications" ON public.sent_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sent notifications" ON public.sent_notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can insert/update sent notifications (cron job uses service role)
-- No INSERT/UPDATE policies for regular users since these are managed by the server

-- Quizzes Policies
CREATE POLICY "Users can view their own quizzes" ON public.quizzes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quizzes" ON public.quizzes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quizzes" ON public.quizzes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quizzes" ON public.quizzes
  FOR DELETE USING (auth.uid() = user_id);

-- Quiz Attempts Policies
CREATE POLICY "Users can view their own quiz attempts" ON public.quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz attempts" ON public.quiz_attempts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quiz attempts" ON public.quiz_attempts
  FOR DELETE USING (auth.uid() = user_id);

-- Google Calendar Integrations Policies
CREATE POLICY "Users can view their own Google Calendar integrations"
  ON public.google_calendar_integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Google Calendar integrations"
  ON public.google_calendar_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Google Calendar integrations"
  ON public.google_calendar_integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Google Calendar integrations"
  ON public.google_calendar_integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Google Calendars Policies
-- Ownership is determined via the related integration's user_id
CREATE POLICY "Users can view their own Google Calendars" ON public.google_calendars
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.google_calendar_integrations
      WHERE public.google_calendar_integrations.id = public.google_calendars.integration_id
      AND public.google_calendar_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own Google Calendars" ON public.google_calendars
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.google_calendar_integrations
      WHERE public.google_calendar_integrations.id = integration_id
      AND public.google_calendar_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own Google Calendars" ON public.google_calendars
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.google_calendar_integrations
      WHERE public.google_calendar_integrations.id = public.google_calendars.integration_id
      AND public.google_calendar_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own Google Calendars" ON public.google_calendars
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.google_calendar_integrations
      WHERE public.google_calendar_integrations.id = public.google_calendars.integration_id
      AND public.google_calendar_integrations.user_id = auth.uid()
    )
  );

-- Google Calendar Events Policies
-- Ownership is determined via calendar -> integration -> user
CREATE POLICY "Users can view their own Google Calendar events"
  ON public.google_calendar_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.google_calendars
      JOIN public.google_calendar_integrations
        ON public.google_calendar_integrations.id = public.google_calendars.integration_id
      WHERE public.google_calendars.id = public.google_calendar_events.calendar_id
      AND public.google_calendar_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own Google Calendar events"
  ON public.google_calendar_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.google_calendars
      JOIN public.google_calendar_integrations
        ON public.google_calendar_integrations.id = public.google_calendars.integration_id
      WHERE public.google_calendars.id = calendar_id
      AND public.google_calendar_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own Google Calendar events"
  ON public.google_calendar_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.google_calendars
      JOIN public.google_calendar_integrations
        ON public.google_calendar_integrations.id = public.google_calendars.integration_id
      WHERE public.google_calendars.id = public.google_calendar_events.calendar_id
      AND public.google_calendar_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own Google Calendar events"
  ON public.google_calendar_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.google_calendars
      JOIN public.google_calendar_integrations
        ON public.google_calendar_integrations.id = public.google_calendars.integration_id
      WHERE public.google_calendars.id = public.google_calendar_events.calendar_id
      AND public.google_calendar_integrations.user_id = auth.uid()
    )
  );
