# Chat API Route - Tagged Documents Extension

## Summary of Changes

### 1. Added Import

- Line 23: `import { getDocumentChunks } from "@/actions/documents/get-document-chunks";`

### 2. Extended Request Schema (Lines 45-76)

- Added `taggedDocuments?: { courseId: string; fileName: string }[]` to request body
- Validates and sanitizes tagged documents:
  - Filters out entries missing courseId or fileName
  - Enforces max 3 unique documents (deduplicates by courseId+fileName)
  - Stores in `validTaggedDocs` variable

### 3. Fetch Chunks for Tagged Documents (Lines 127-211)

- For each validated tagged document:
  - Calls `getDocumentChunks({ fileName, courseId })`
  - Collects successful results with metadata (fileName, chunkIndex, totalChunks, content)
  - Logs failures and stores failed document names in `failedDocNames`
- Sorts chunks by fileName then chunkIndex
- Truncates if total chars exceed 20,000 character threshold
- Builds `taggedDocsContext` string with clear document headers:
  - Format: `DOCUMENT: <fileName>` followed by `--- Chunk N of M ---` delimiters

### 4. Updated System Prompt (Lines 251-285)

- Conditionally includes tagged document context when present
- Adds warning if any tagged documents failed to load
- **Enforces hard-filter semantics**:
  - When tagged documents exist, instructs model to use ONLY tagged document context
  - Prohibits use of `retrieve_course_context` or other document retrieval
  - States to indicate if answer is not found in provided documents

### 5. Modified Tools Object (Lines 2525-2535)

- After creating result object, conditionally removes `retrieve_course_context` tool
- This enforces hard-filter semantics by preventing model from searching other documents
- Logs the removal for debugging purposes

### 6. Error Handling

- Chunk fetch failures are caught, logged, and tracked in `failedDocNames`
- Failed documents are noted in system prompt warning
- System gracefully degrades to answer using remaining successfully fetched documents

## Key Features

1. **Authorization**: Handled by existing `getDocumentChunks` function which checks user authentication
2. **Validation**: Max 3 unique documents, ignores malformed entries
3. **Truncation**: 20,000 character limit to prevent context overflow
4. **Clear Formatting**: Document headers and chunk delimiters for model understanding
5. **Hard-Filter Semantics**: Model instructed to use ONLY tagged document context
6. **Tool Removal**: `retrieve_course_context` removed when tagged documents present
7. **Error Gracefulness**: Failed documents noted in prompt, remaining docs still used

## Usage Example

```json
{
  "messages": [...],
  "pageContext": {...},
  "taggedDocuments": [
    { "courseId": "abc123", "fileName": "syllabus.pdf" },
    { "courseId": "def456", "fileName": "lecture_notes.pdf" }
  ]
}
```

The system will fetch chunks from these specific documents and enforce that the model uses ONLY this context when answering.
