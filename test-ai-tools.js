/**
 * AI Tools Testing Script
 * Run tests against the AI chat API to validate tooling capabilities
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const testContent = require("./ai-tooling-test-content.ts");

// Mock fetch for testing (replace with actual implementation)
const mockFetch = async (url, options) => {
  console.log(`Mock API call to: ${url}`);
  console.log(`Request body:`, JSON.parse(options.body));

  // Simulate AI responses based on input
  const { messages } = JSON.parse(options.body);
  const lastMessage = messages[messages.length - 1];

  // Mock tool calls based on message content
  let mockToolCalls = [];

  if (lastMessage.content.toLowerCase().includes("syllabus")) {
    mockToolCalls = [
      {
        name: "parse_syllabus",
        arguments: {
          raw_text: testContent.sampleSyllabi.computerScience101,
          course_code: "CSC101",
        },
      },
    ];
  } else if (
    lastMessage.content.toLowerCase().includes("due") ||
    lastMessage.content.toLowerCase().includes("schedule")
  ) {
    mockToolCalls = [
      {
        name: "query_schedule",
        arguments: {
          start_date: "2024-12-01",
          end_date: "2024-12-07",
        },
      },
    ];
  } else if (
    lastMessage.content.toLowerCase().includes("got") &&
    lastMessage.content.toLowerCase().includes("%")
  ) {
    mockToolCalls = [
      {
        name: "update_task_score",
        arguments: {
          task_name: "homework",
          score: 95,
        },
      },
    ];
  }

  return {
    ok: true,
    json: async () => ({
      toolCalls: mockToolCalls,
      message: `Mock response for: ${lastMessage.content.substring(0, 50)}...`,
    }),
  };
};

// Test runner class
class AIToolsTester {
  constructor(baseUrl = "http://localhost:3000") {
    this.baseUrl = baseUrl;
    this.fetch = mockFetch; // Use mock for testing
  }

  async runTest(testName, messages) {
    console.log(`\n🧪 Running test: ${testName}`);

    try {
      const response = await this.fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Test passed");
      console.log(
        "Tool calls made:",
        result.toolCalls?.map((tc) => tc.name) || [],
      );
      return result;
    } catch (error) {
      console.log("❌ Test failed:", error.message);
      throw error;
    }
  }

  async runAllTests() {
    console.log("🚀 Starting AI Tools Testing Suite\n");

    const results = {
      passed: 0,
      failed: 0,
      total: 0,
    };

    // Test syllabus parsing
    for (const [key, test] of Object.entries(
      testContent.testConversations.syllabusParsing,
    )) {
      results.total++;
      try {
        const messages = [{ role: "user", content: test.user }];
        await this.runTest(`Syllabus Parsing - ${key}`, messages);
        results.passed++;
      } catch {
        results.failed++;
      }
    }

    // Test schedule queries
    for (const [key, test] of Object.entries(
      testContent.testConversations.scheduleQueries,
    )) {
      results.total++;
      try {
        const messages = [{ role: "user", content: test.user }];
        await this.runTest(`Schedule Query - ${key}`, messages);
        results.passed++;
      } catch {
        results.failed++;
      }
    }

    // Test score updates
    for (const [key, test] of Object.entries(
      testContent.testConversations.scoreUpdates,
    )) {
      results.total++;
      try {
        const messages = [{ role: "user", content: test.user }];
        await this.runTest(`Score Update - ${key}`, messages);
        results.passed++;
      } catch {
        results.failed++;
      }
    }

    // Print results
    console.log("\n📊 Test Results Summary");
    console.log("========================");
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(
      `Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`,
    );

    return results;
  }

  // Test specific scenarios
  async testSyllabusParsing() {
    console.log("\n📚 Testing Syllabus Parsing");

    const testCases = [
      {
        name: "Computer Science 101",
        syllabus: testContent.sampleSyllabi.computerScience101,
        expectedTasks: 4,
      },
      {
        name: "Data Science Fundamentals",
        syllabus: testContent.sampleSyllabi.dataScience,
        expectedTasks: 6,
      },
      {
        name: "Philosophy Ethics",
        syllabus: testContent.sampleSyllabi.philosophyEthics,
        expectedTasks: 4,
      },
    ];

    for (const testCase of testCases) {
      console.log(`\nTesting: ${testCase.name}`);
      const messages = [
        { role: "user", content: `Parse this syllabus: ${testCase.syllabus}` },
      ];

      try {
        const result = await this.runTest(`Parse ${testCase.name}`, messages);
        console.log(
          `Expected ${testCase.expectedTasks} tasks, got ${result.toolCalls?.length || 0} tool calls`,
        );
      } catch {
        console.log(`Failed to parse ${testCase.name}`);
      }
    }
  }

  async testScheduleQueries() {
    console.log("\n📅 Testing Schedule Queries");

    const queries = [
      "What do I have due this week?",
      "Show me assignments for next month",
      "What assignments are due between Dec 15 and Dec 31?",
    ];

    for (const query of queries) {
      await this.runTest(`Schedule: ${query.substring(0, 30)}...`, [
        { role: "user", content: query },
      ]);
    }
  }

  async testScoreUpdates() {
    console.log("\n📊 Testing Score Updates");

    const updates = [
      "I got 95% on my CS101 Homework 1",
      "My midterm exam score was 87 out of 100",
      "I scored 92 on the calculus quiz",
    ];

    for (const update of updates) {
      await this.runTest(`Score Update: ${update.substring(0, 30)}...`, [
        { role: "user", content: update },
      ]);
    }
  }

  async testEdgeCases() {
    console.log("\n🔧 Testing Edge Cases");

    const edgeCaseTests = [
      {
        name: "Malformed Syllabus",
        input: testContent.edgeCases.malformedSyllabus,
      },
      {
        name: "Minimal Syllabus",
        input: testContent.edgeCases.minimalSyllabus,
      },
      {
        name: "Complex Nested Syllabus",
        input: testContent.edgeCases.complexNestedSyllabus,
      },
    ];

    for (const test of edgeCaseTests) {
      await this.runTest(`Edge Case: ${test.name}`, [
        { role: "user", content: `Parse this syllabus: ${test.input}` },
      ]);
    }
  }
}

// Export for use in other files
module.exports = { AIToolsTester, testContent };

// Run tests if called directly
if (require.main === module) {
  const tester = new AIToolsTester();

  // Run specific test suites
  tester
    .testSyllabusParsing()
    .then(() => tester.testScheduleQueries())
    .then(() => tester.testScoreUpdates())
    .then(() => tester.testEdgeCases())
    .then(() => {
      console.log("\n🎉 All tests completed!");
    })
    .catch((error) => {
      console.error("❌ Test suite failed:", error);
      process.exit(1);
    });
}
