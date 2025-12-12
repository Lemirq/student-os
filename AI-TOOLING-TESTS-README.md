# AI Tooling Test Suite

This directory contains comprehensive test content and utilities for testing the AI chat functionality in the Student OS application.

## Overview

The AI system includes three main tools:

- **parse_syllabus**: Extracts structured tasks, exams, and weights from syllabus text
- **query_schedule**: Retrieves tasks due within a specified date range
- **update_task_score**: Updates scores for specific tasks
- **Display tools**: showSyllabus, showSchedule, showTaskUpdate (client-side UI tools)

## Files

### `ai-tooling-test-content.ts`

Comprehensive test data including:

- **Sample syllabi** in various formats (structured, complex, minimal, edge cases)
- **Test conversations** that trigger different AI tools
- **Expected responses** for validation
- **Edge cases** for error handling testing
- **Integration test scenarios** for full workflows

### `test-ai-tools.js`

Test runner script that can:

- Simulate AI chat interactions
- Test individual tools or full workflows
- Validate tool call responses
- Run comprehensive test suites

## Sample Syllabus Formats Tested

The test suite includes syllabi with:

- ✅ Clear structure with percentages and dates
- ✅ Complex grading schemes (nested assessments)
- ✅ Minimal information (just essentials)
- ✅ Unusual formatting (markdown, bullet points)
- ✅ Foreign languages
- ✅ Malformed/incomplete data (error handling)
- ✅ Very long content (performance testing)

## Test Scenarios

### 1. Syllabus Parsing Tests

```typescript
// Example test case
{
  user: "Can you help me import this syllabus for my CS101 class?",
  syllabus_content: sampleSyllabi.computerScience101,
  expected_tools: ["parse_syllabus", "showSyllabus"]
}
```

### 2. Schedule Query Tests

```typescript
{
  user: "What do I have due this week?",
  date_range: { start: "2024-12-01", end: "2024-12-07" },
  expected_tools: ["query_schedule", "showSchedule"]
}
```

### 3. Score Update Tests

```typescript
{
  user: "I got 95% on my CS101 Homework 1",
  task_info: { name: "Homework 1", score: 95 },
  expected_tools: ["update_task_score", "showTaskUpdate"]
}
```

## Running Tests

### Prerequisites

1. Student OS application running locally
2. Database seeded with test data (see `seed_dummy_data.sql`)
3. Node.js environment

### Basic Test Run

```bash
# Run the test suite
node test-ai-tools.js

# Or with npm/yarn
npm run test:ai-tools
```

### Testing Individual Components

```javascript
const { AIToolsTester } = require("./test-ai-tools");

const tester = new AIToolsTester("http://localhost:3000");

// Test syllabus parsing
await tester.testSyllabusParsing();

// Test schedule queries
await tester.testScheduleQueries();

// Test score updates
await tester.testScoreUpdates();

// Test edge cases
await tester.testEdgeCases();

// Run all tests
await tester.runAllTests();
```

## Manual Testing with Real AI

### 1. Syllabus Import Test

```
User: "Can you help me import this syllabus?"

[Provide one of the sample syllabi from ai-tooling-test-content.ts]

Expected: AI calls parse_syllabus → showSyllabus displays structured data
```

### 2. Schedule Query Test

```
User: "What assignments do I have due this week?"

Expected: AI calls query_schedule → showSchedule displays tasks
```

### 3. Score Update Test

```
User: "I got 92% on my calculus homework"

Expected: AI calls update_task_score → showTaskUpdate confirms update
```

## Integration Test Scenarios

### Complete Student Workflow

1. Import syllabus → parse_syllabus + showSyllabus
2. Check schedule → query_schedule + showSchedule
3. Update score → update_task_score + showTaskUpdate
4. Review updated schedule → query_schedule + showSchedule

### Error Recovery

1. Try malformed syllabus → Graceful error handling
2. Try valid syllabus → Successful parsing
3. Update non-existent task → Graceful error handling

## Adding New Test Cases

### New Syllabus Format

```typescript
export const sampleSyllabi = {
  // Add to existing sampleSyllabi object
  newCourse: `
  COURSE NAME
  Assessment breakdown...
  Due dates...
  `,
};
```

### New Test Scenario

```typescript
export const testConversations = {
  newScenario: [
    {
      user: "Test message that triggers tool",
      ai_should_call: "tool_name",
      expected_tools: ["tool_name", "display_tool"],
    },
  ],
};
```

## Test Data Structure

The test content follows this structure:

- **Sample syllabi**: Raw text that users might provide
- **Test conversations**: Natural language inputs that should trigger tools
- **Expected outputs**: What the AI should return after tool execution
- **Edge cases**: Unusual inputs to test error handling

## Validation

Tests validate:

- ✅ Correct tools are called for given inputs
- ✅ Tool parameters are properly formatted
- ✅ Error handling for invalid inputs
- ✅ Integration between multiple tools
- ✅ Display tools show correct information

## Troubleshooting

### Common Issues

1. **Tool not called**: Check if user message matches expected patterns
2. **Wrong tool called**: Review conversation context and tool descriptions
3. **Parsing errors**: Ensure syllabus has clear assessment structure
4. **Database errors**: Verify test data is seeded correctly

### Debugging

- Check AI system prompt for tool instructions
- Review tool parameter schemas
- Test individual tools in isolation
- Use mock responses for isolated testing

## Contributing

When adding new test cases:

1. Follow existing naming conventions
2. Include both positive and negative test cases
3. Add clear comments explaining test purpose
4. Update this README with new scenarios
5. Test against real AI before committing
