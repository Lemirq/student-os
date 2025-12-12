/**
 * Test Content for AI Tooling Capabilities
 * This file contains sample data and scenarios to test the AI chat functionality
 */

// ============================================================================
// SYLLABUS PARSING TEST CONTENT
// ============================================================================

export const sampleSyllabi = {
  // Test syllabus with clear structure
  computerScience101: `
CSC 101 - Introduction to Computer Science
Fall 2024

Course Overview:
This course introduces fundamental concepts in computer science including programming, algorithms, and data structures.

Assessment Breakdown:
- Programming Assignments: 40% (4 assignments, 10% each)
- Midterm Exam: 25%
- Final Exam: 25%
- Participation: 10%

Important Dates:
- Assignment 1: Programming Basics - Due September 15, 2024
- Assignment 2: Algorithms - Due October 1, 2024
- Assignment 3: Data Structures - Due October 22, 2024
- Assignment 4: Final Project - Due November 12, 2024
- Midterm Exam: October 8, 2024
- Final Exam: December 15, 2024

Weekly Participation: Attend labs and submit weekly exercises (10% total)
`,

  // Test syllabus with complex grading structure
  dataScience: `
DATA 201 - Data Science Fundamentals
Spring 2025

Course Description:
Learn data analysis, statistical methods, and machine learning basics.

Grading Components:
- Homework (20%): 5 assignments worth 4% each
- Labs (25%): 10 weekly labs worth 2.5% each
- Midterm Project (15%): Due March 10, 2025
- Final Project (25%): Due May 5, 2025
- Midterm Exam (10%): March 20, 2025
- Final Exam (5%): May 15, 2025

Weekly Schedule:
- Labs: Every Tuesday, starting January 14, 2025
- Homework due dates: Every other Friday
`,

  // Test syllabus with minimal structure
  philosophyEthics: `
PHIL 205 - Ethics and Society

This course explores moral philosophy and ethical decision-making.

Grading:
- Essay 1: 25% (Due Feb 15)
- Essay 2: 25% (Due Mar 15)
- Final Paper: 30% (Due Apr 30)
- Participation: 20%

Class meets Tuesdays and Thursdays. Office hours by appointment.
`,

  // Test syllabus with unusual formatting
  businessFinance: `
BUS 301 - Corporate Finance

**Key Assessments:**
• Case Study 1 (15%) - Due Week 4
• Group Project (25%) - Due Week 8
• Midterm (20%) - Week 7
• Final Exam (30%) - Final Week
• Weekly Quizzes (10%) - Every Monday

**Important Notes:**
- All assignments submitted via Blackboard
- Late work penalty: 10% per day
- Group work requires peer evaluation
`,

  // Test syllabus with no clear percentages
  literatureSurvey: `
ENG 250 - American Literature Survey

Assignments:
- Reading Responses: 10 total, 1% each (10%)
- Midterm Essay: 20%
- Final Essay: 25%
- Presentation: 15%
- Attendance: 5%
- Final Exam: 25%

Reading schedule available on syllabus page.
`,

  // Test syllabus with complex multi-part assignments
  engineeringDesign: `
ENGR 401 - Senior Design Project

Course Structure:
Phase 1: Project Proposal (10%) - Due Week 3
Phase 2: Design Review (15%) - Due Week 6
Phase 3: Prototype Development (25%) - Due Week 10
Phase 4: Final Presentation (20%) - Due Week 14
Phase 5: Technical Report (20%) - Due Week 15

Weekly Check-ins: 5% (attendance and progress reports)
Midterm Review: 5% (Week 8)
`,

  // Test syllabus with international dates and formats
  internationalBusiness: `
IB 305 - International Business

Assessment Weights:
- Group Case Analysis (20%): Due 15/03/2025
- Individual Research Paper (25%): Due 12/04/2025
- Mid-term Examination (15%): 25/03/2025
- Final Examination (25%): 15/05/2025
- Class Participation (10%): Ongoing
- Peer Review Assignments (5%): Weekly

Note: All dates in DD/MM/YYYY format.
`,
};

// ============================================================================
// TEST CONVERSATIONS FOR AI TOOLS
// ============================================================================

export const testConversations = {
  // Test syllabus parsing
  syllabusParsing: [
    {
      user: "Can you help me import this syllabus for my CS101 class?",
      ai_should_call: "parse_syllabus",
      syllabus_content: sampleSyllabi.computerScience101,
      expected_tools: ["parse_syllabus", "showSyllabus"],
    },
    {
      user: "I have this syllabus text, can you extract the assignments and their weights?",
      ai_should_call: "parse_syllabus",
      syllabus_content: sampleSyllabi.dataScience,
      expected_tools: ["parse_syllabus", "showSyllabus"],
    },
  ],

  // Test schedule querying
  scheduleQueries: [
    {
      user: "What do I have due this week?",
      ai_should_call: "query_schedule",
      date_range: { start: "2024-12-01", end: "2024-12-07" },
      expected_tools: ["query_schedule", "showSchedule"],
    },
    {
      user: "Show me my assignments for next month",
      ai_should_call: "query_schedule",
      date_range: { start: "2024-12-08", end: "2025-01-08" },
      expected_tools: ["query_schedule", "showSchedule"],
    },
    {
      user: "What assignments are due between Dec 15 and Dec 31?",
      ai_should_call: "query_schedule",
      date_range: { start: "2024-12-15", end: "2024-12-31" },
      expected_tools: ["query_schedule", "showSchedule"],
    },
  ],

  // Test task score updates
  scoreUpdates: [
    {
      user: "I got 95% on my CS101 Homework 1",
      ai_should_call: "update_task_score",
      task_info: { name: "Homework 1", score: 95 },
      expected_tools: ["update_task_score", "showTaskUpdate"],
    },
    {
      user: "My midterm exam score was 87 out of 100",
      ai_should_call: "update_task_score",
      task_info: { name: "Midterm", score: 87 },
      expected_tools: ["update_task_score", "showTaskUpdate"],
    },
    {
      user: "I scored 92 on the calculus quiz",
      ai_should_call: "update_task_score",
      task_info: { name: "calculus quiz", score: 92 },
      expected_tools: ["update_task_score", "showTaskUpdate"],
    },
  ],

  // Test complex multi-tool conversations
  complexScenarios: [
    {
      conversation: [
        "Can you help me import this course syllabus?",
        "[User provides syllabus text]",
        "Great! Now what do I have due this week?",
        "I got 88% on my recent assignment",
      ],
      expected_tool_sequence: [
        "parse_syllabus",
        "showSyllabus",
        "query_schedule",
        "showSchedule",
        "update_task_score",
        "showTaskUpdate",
      ],
    },
    {
      conversation: [
        "Show me my upcoming assignments",
        "I need to update my score for the data structures homework - got 91%",
        "What's my schedule look like for next week?",
      ],
      expected_tool_sequence: [
        "query_schedule",
        "showSchedule",
        "update_task_score",
        "showTaskUpdate",
        "query_schedule",
        "showSchedule",
      ],
    },
  ],
};

// ============================================================================
// EDGE CASE TEST CONTENT
// ============================================================================

export const edgeCases = {
  // Test with malformed syllabus
  malformedSyllabus: `
  This is not a real syllabus.
  Just some random text.
  No structure here.
  Maybe a few dates: sometime, never, tomorrow.
  `,

  // Test with conflicting information
  conflictingSyllabus: `
  Course: MATH 200

  Grading:
  - Homework: 50%
  - Exams: 60% (this adds up to 110% - error!)

  Due dates:
  - HW1: Yesterday
  - HW2: Today
  - HW3: Tomorrow but also last week
  `,

  // Test with very long syllabus
  longSyllabus: `
  COURSE SYLLABUS - ADVANCED TOPICS IN COMPUTER SCIENCE
  ${"This is a very long description that repeats many times. ".repeat(100)}

  Assessment Components:
  ${Array.from({ length: 50 }, (_, i) => `- Assignment ${i + 1}: ${Math.floor(Math.random() * 10) + 1}%`).join("\n")}

  Weekly Schedule:
  ${Array.from({ length: 52 }, (_, i) => `- Week ${i + 1}: Topic ${i + 1} - Due ${new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}`).join("\n")}
  `,

  // Test with foreign language
  foreignLanguageSyllabus: `
  Cours de Programmation Avancée

  Évaluation:
  - Devoirs: 40%
  - Examen intermédiaire: 30%
  - Examen final: 30%

  Dates importantes:
  - Devoir 1: Programmation de base - À rendre le 15 septembre 2024
  - Devoir 2: Algorithmes - À rendre le 1 octobre 2024
  `,

  // Test with minimal information
  minimalSyllabus: `
  CS101
  Homework: 50%
  Final: 50%
  Due dates: Various
  `,

  // Test with complex nested structures
  complexNestedSyllabus: `
  PROJECT MANAGEMENT COURSE

  Assessment Structure:
  - Individual Work (60%):
    * Essays (20%): 3 essays, 5% each, 2% for peer review each
    * Presentations (15%): 2 presentations, 7.5% each
    * Final Report (25%): 15% content, 10% formatting
  - Group Work (40%):
    * Group Project (30%): 10% planning, 10% execution, 10% presentation
    * Peer Assessment (10%): Group members evaluate each other

  Timeline:
  - Phase 1 (Weeks 1-4): Individual research and essay 1
  - Phase 2 (Weeks 5-8): Group formation and project planning
  - Phase 3 (Weeks 9-12): Project execution and essay 2
  - Phase 4 (Weeks 13-15): Final presentations and report
  `,
};

// ============================================================================
// EXPECTED AI RESPONSES FOR TESTING
// ============================================================================

export const expectedResponses = {
  syllabusParsing: {
    computerScience101: {
      course: "CSC101",
      tasks: [
        {
          title: "Programming Assignments",
          weight: 40,
          due_date: "Various",
          type: "Assignment",
        },
        {
          title: "Midterm Exam",
          weight: 25,
          due_date: "2024-10-08",
          type: "Exam",
        },
        {
          title: "Final Exam",
          weight: 25,
          due_date: "2024-12-15",
          type: "Exam",
        },
        {
          title: "Participation",
          weight: 10,
          due_date: "Weekly",
          type: "Participation",
        },
      ],
    },
  },

  errorHandling: {
    noTasksFound:
      "I couldn't find any tasks matching your request. Please check the date range or task name.",
    syllabusParseError:
      "I had trouble parsing this syllabus. Please make sure it contains clear assessment information.",
    scoreUpdateError:
      "I couldn't find a task with that name. Please check the spelling or provide more details.",
  },
};

// ============================================================================
// TEST UTILITIES
// ============================================================================

interface ToolCall {
  name: string;
  arguments?: Record<string, unknown>;
}

interface ParsedTask {
  title: string;
  weight: number;
  due_date: string;
  type: string;
}

interface ParsedSyllabusData {
  course: string;
  tasks: ParsedTask[];
}

interface SyllabusParsingTest {
  user: string;
  ai_should_call: string;
  syllabus_content: string;
  expected_tools: string[];
}

interface ScheduleQueryTest {
  user: string;
  ai_should_call: string;
  date_range: { start: string; end: string };
  expected_tools: string[];
}

interface ScoreUpdateTest {
  user: string;
  ai_should_call: string;
  task_info: { name: string; score: number };
  expected_tools: string[];
}

export const testUtils = {
  /**
   * Generate test messages for AI chat testing
   */
  generateTestMessages: (scenario: keyof typeof testConversations) => {
    const scenarioData = testConversations[scenario];
    if (Array.isArray(scenarioData)) {
      return scenarioData
        .filter(
          (
            test,
          ): test is
            | SyllabusParsingTest
            | ScheduleQueryTest
            | ScoreUpdateTest => "user" in test,
        )
        .map((test) => ({
          role: "user" as const,
          content: test.user,
        }));
    }
    return [];
  },

  /**
   * Validate AI tool calls match expected pattern
   */
  validateToolCalls: (toolCalls: ToolCall[], expectedTools: string[]) => {
    const calledTools = toolCalls.map((call) => call.name);
    return expectedTools.every((tool) => calledTools.includes(tool));
  },

  /**
   * Test syllabus parsing accuracy
   */
  validateSyllabusParsing: (
    parsedData: ParsedSyllabusData,
    expectedData: ParsedSyllabusData,
  ) => {
    // Check if course code is extracted
    if (parsedData.course !== expectedData.course) return false;

    // Check if all major tasks are found
    const parsedTasks = parsedData.tasks || [];
    const expectedTasks = expectedData.tasks || [];

    return expectedTasks.every((expectedTask: ParsedTask) =>
      parsedTasks.some((parsedTask: ParsedTask) =>
        parsedTask.title
          .toLowerCase()
          .includes(expectedTask.title.toLowerCase().split(" ")[0]),
      ),
    );
  },
};

// ============================================================================
// INTEGRATION TEST SCENARIOS
// ============================================================================

export const integrationTests = {
  fullWorkflow: {
    name: "Complete Student Workflow",
    steps: [
      {
        action: "Import syllabus",
        input: sampleSyllabi.computerScience101,
        expected_tools: ["parse_syllabus", "showSyllabus"],
      },
      {
        action: "Check upcoming work",
        input: "What do I have due this week?",
        expected_tools: ["query_schedule", "showSchedule"],
      },
      {
        action: "Update completed assignment",
        input: "I got 95% on my first homework",
        expected_tools: ["update_task_score", "showTaskUpdate"],
      },
      {
        action: "Review updated schedule",
        input: "Show me my schedule again",
        expected_tools: ["query_schedule", "showSchedule"],
      },
    ],
  },

  errorRecovery: {
    name: "Error Handling and Recovery",
    steps: [
      {
        action: "Try invalid syllabus",
        input: edgeCases.malformedSyllabus,
        expected_tools: ["parse_syllabus"], // Should fail gracefully
        expect_error: true,
      },
      {
        action: "Try valid syllabus",
        input: sampleSyllabi.philosophyEthics,
        expected_tools: ["parse_syllabus", "showSyllabus"],
      },
      {
        action: "Update non-existent task",
        input: "I got 100% on my imaginary assignment",
        expected_tools: ["update_task_score"], // Should fail gracefully
        expect_error: true,
      },
    ],
  },
};

const aiToolingTestContent = {
  sampleSyllabi,
  testConversations,
  edgeCases,
  expectedResponses,
  testUtils,
  integrationTests,
};

export default aiToolingTestContent;
