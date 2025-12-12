/*
  SQL Query to inject dummy data for testing the Dashboard features.
  
  Target Semester ID: 2f15dcd7-9ba0-4549-acba-3df920703521
  User ID: We need to find a valid user ID first or assume one. 
  Let's assume the user ID associated with the semester is needed.
  
  Since we are running this as raw SQL, we will hardcode the user ID associated with the semester.
  First, we'll fetch the user_id from the semester to ensure referential integrity.
  Then we'll insert Courses, Grade Weights, and Tasks.

  Scenario:
  1. "Introduction to Computer Science" (CS101) - Color: Blue
     - Goal: 90%
     - Weights: Homework (40%), Midterm (30%), Final (30%)
     - Status: Doing well, but high stakes midterm coming up.
  
  2. "Calculus I" (MATH101) - Color: Red
     - Goal: 85%
     - Weights: Quizzes (20%), Exams (80%)
     - Status: Behind schedule, needs high performance.

  3. "History of Art" (ART101) - Color: Yellow
     - Goal: 95%
     - Weights: Essays (50%), Participation (50%)
     - Status: Easy A, almost done.
*/

DO $$
DECLARE
  v_semester_id UUID := '2f15dcd7-9ba0-4549-acba-3df920703521';
  v_user_id UUID;
  
  -- Course IDs
  v_cs_id UUID := gen_random_uuid();
  v_math_id UUID := gen_random_uuid();
  v_art_id UUID := gen_random_uuid();

  -- Grade Weight IDs
  v_cs_hw_id UUID := gen_random_uuid();
  v_cs_midterm_id UUID := gen_random_uuid();
  v_cs_final_id UUID := gen_random_uuid();
  
  v_math_quiz_id UUID := gen_random_uuid();
  v_math_exam_id UUID := gen_random_uuid();
  
  v_art_essay_id UUID := gen_random_uuid();
  v_art_part_id UUID := gen_random_uuid();

BEGIN
  -- 1. Get User ID from Semester
  SELECT user_id INTO v_user_id FROM semesters WHERE id = v_semester_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Semester not found or has no user';
  END IF;

  -- 2. Clear existing data for this semester (Optional, based on "pretend no courses exist")
  DELETE FROM courses WHERE semester_id = v_semester_id;

  -- 3. Insert Courses
  INSERT INTO courses (id, user_id, semester_id, code, name, color, goal_grade) VALUES
  (v_cs_id, v_user_id, v_semester_id, 'CS101', 'Intro to Computer Science', '#3b82f6', 90.00),
  (v_math_id, v_user_id, v_semester_id, 'MATH101', 'Calculus I', '#ef4444', 85.00),
  (v_art_id, v_user_id, v_semester_id, 'ART101', 'History of Art', '#eab308', 95.00);

  -- 4. Insert Grade Weights
  INSERT INTO grade_weights (id, course_id, name, weight_percent) VALUES
  -- CS101
  (v_cs_hw_id, v_cs_id, 'Homework', 40.00),
  (v_cs_midterm_id, v_cs_id, 'Midterm', 30.00),
  (v_cs_final_id, v_cs_id, 'Final Exam', 30.00),
  -- MATH101
  (v_math_quiz_id, v_math_id, 'Quizzes', 20.00),
  (v_math_exam_id, v_math_id, 'Exams', 80.00),
  -- ART101
  (v_art_essay_id, v_art_id, 'Essays', 50.00),
  (v_art_part_id, v_art_id, 'Participation', 50.00);

  -- 5. Insert Tasks

  -- CS101 Tasks
  -- Completed Homeworks (Good grades)
  INSERT INTO tasks (user_id, course_id, grade_weight_id, title, status, priority, due_date, score_received, score_max) VALUES
  (v_user_id, v_cs_id, v_cs_hw_id, 'Homework 1', 'Done', 'Low', NOW() - INTERVAL '10 days', 95, 100),
  (v_user_id, v_cs_id, v_cs_hw_id, 'Homework 2', 'Done', 'Low', NOW() - INTERVAL '3 days', 90, 100);
  
  -- Upcoming High Stakes Task
  INSERT INTO tasks (user_id, course_id, grade_weight_id, title, status, priority, due_date, score_received, score_max) VALUES
  (v_user_id, v_cs_id, v_cs_midterm_id, 'CS Midterm Exam', 'Todo', 'High', NOW() + INTERVAL '5 days', NULL, 100);
  
  -- Future Tasks
  INSERT INTO tasks (user_id, course_id, grade_weight_id, title, status, priority, due_date, score_received, score_max) VALUES
  (v_user_id, v_cs_id, v_cs_hw_id, 'Homework 3', 'Todo', 'Medium', NOW() + INTERVAL '12 days', NULL, 100);

  -- MATH101 Tasks
  -- Poor performance on quizzes so far
  INSERT INTO tasks (user_id, course_id, grade_weight_id, title, status, priority, due_date, score_received, score_max) VALUES
  (v_user_id, v_math_id, v_math_quiz_id, 'Quiz 1', 'Done', 'Medium', NOW() - INTERVAL '15 days', 60, 100),
  (v_user_id, v_math_id, v_math_quiz_id, 'Quiz 2', 'Done', 'Medium', NOW() - INTERVAL '8 days', 70, 100);
  
  -- Big Exam coming up (High Stakes)
  INSERT INTO tasks (user_id, course_id, grade_weight_id, title, status, priority, due_date, score_received, score_max) VALUES
  (v_user_id, v_math_id, v_math_exam_id, 'Midterm I', 'Todo', 'High', NOW() + INTERVAL '2 days', NULL, 100);

  -- ART101 Tasks
  -- Doing great
  INSERT INTO tasks (user_id, course_id, grade_weight_id, title, status, priority, due_date, score_received, score_max) VALUES
  (v_user_id, v_art_id, v_art_essay_id, 'Renaissance Essay', 'Done', 'Medium', NOW() - INTERVAL '20 days', 98, 100),
  (v_user_id, v_art_id, v_art_part_id, 'Week 1-4 Participation', 'Done', 'Low', NOW(), 100, 100);

  -- Upcoming Essay (Heatmap data point)
  INSERT INTO tasks (user_id, course_id, grade_weight_id, title, status, priority, due_date, score_received, score_max) VALUES
  (v_user_id, v_art_id, v_art_essay_id, 'Modern Art Analysis', 'Todo', 'Medium', NOW() + INTERVAL '4 days', NULL, 100);

END $$;

