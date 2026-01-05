# RAG System Documentation

This document describes the Retrieval-Augmented Generation (RAG) system architecture for StudentOS, including the integration between the Next.js application and the FastAPI RAG microservice.

## Overview

StudentOS uses a hybrid RAG architecture:

- **PDF documents** are processed by a dedicated FastAPI microservice
- **Text documents** are processed locally in the Next.js app
- **All documents** are stored in Supabase with pgvector embeddings for semantic search

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js Application                       │
│                                                                   │
│  ┌────────────────┐              ┌────────────────┐             │
│  │  PDF Upload    │              │  Text Upload   │             │
│  │  Component     │              │  Component     │             │
│  └───────┬────────┘              └────────┬───────┘             │
│          │                                 │                     │
│          v                                 v                     │
│  ┌────────────────┐              ┌────────────────┐             │
│  │  uploadPdf()   │              │ saveTextDoc()  │             │
│  │  action        │              │ action         │             │
│  └───────┬────────┘              └────────┬───────┘             │
│          │                                 │                     │
│          │                                 │ (local chunking     │
│          │                                 │  + embedding)       │
│          │                                 │                     │
└──────────┼─────────────────────────────────┼─────────────────────┘
           │                                 │
           │ HTTP POST                       │
           │ /process-pdf                    │
           v                                 │
┌─────────────────────────┐                 │
│  FastAPI RAG Service    │                 │
│  (student-os-rag)       │                 │
│                         │                 │
│  1. PDF → Markdown      │                 │
│     (pymupdf4llm)       │                 │
│                         │                 │
│  2. Semantic Chunking   │                 │
│     (by headers)        │                 │
│                         │                 │
│  3. Generate Embeddings │                 │
│     (OpenAI)            │                 │
│                         │                 │
│  Returns: chunks[]      │                 │
└───────────┬─────────────┘                 │
            │                               │
            │ JSON Response                 │
            v                               v
┌───────────────────────────────────────────────────────┐
│              Supabase PostgreSQL                       │
│              (with pgvector extension)                 │
│                                                        │
│  documents table:                                      │
│  - id, userId, courseId, documentType                 │
│  - fileName, chunkIndex, content                      │
│  - embedding (vector 1536)                            │
│  - metadata (jsonb)                                   │
│  - createdAt, updatedAt                               │
└───────────────────────────────────────────────────────┘
```

## Components

### 1. Next.js Application (`/student-os`)

#### Document Upload Actions

**`actions/documents/upload-pdf.ts`**

- Handles PDF file uploads from users
- Validates file type and course ownership
- Sends PDF to RAG microservice for processing
- Receives chunks with embeddings
- Inserts chunks into Supabase database
- **Used for**: PDF files only

**`actions/documents/save-text-document.ts`**

- Handles manually entered text documents
- Performs local text chunking (500 tokens, 50 overlap)
- Generates embeddings using OpenAI
- Inserts chunks into Supabase database
- **Used for**: Plain text, markdown, or text files

**`actions/documents/search-documents.ts`**

- Semantic search across document chunks
- Generates query embedding
- Uses pgvector cosine similarity search
- Returns top-K relevant chunks
- **Used by**: Chat AI, document search features

#### Core Libraries (Still Active)

**`lib/embedder.ts`**

- Generates embeddings using OpenAI's `text-embedding-3-small`
- 1536-dimensional vectors
- Includes retry logic with exponential backoff
- **Used by**: `save-text-document.ts` for text-only uploads

**`lib/vector-search.ts`**

- PostgreSQL pgvector integration
- Cosine similarity search using `<=>` operator
- Configurable similarity threshold (default: 0.7)
- **Used by**: `search-documents.ts` for RAG queries

#### Removed Libraries (Now in RAG Microservice)

- ~~`lib/pdf-parser.ts`~~ - PDF extraction (moved to microservice)
- ~~`lib/chunker.ts`~~ - Text chunking (moved to microservice)
- ~~`lib/file-parser.ts`~~ - File type detection (no longer needed)

### 2. RAG Microservice (`/student-os-rag`)

A dedicated FastAPI service for processing PDF documents.

#### Endpoints

**`POST /process-pdf`**

Processes a PDF file and returns chunked, embedded data.

**Request (multipart/form-data):**

```typescript
{
  file: File,              // PDF file
  user_id: string,         // User UUID
  file_name: string,       // Original filename
  document_type: string,   // "syllabus" | "notes" | "other"
  course_id?: string       // Optional course UUID
}
```

**Response (application/json):**

```typescript
{
  file_name: string,
  total_chunks: number,
  markdown_preview: string,  // First 500 chars
  chunks: [
    {
      chunk_index: number,
      content: string,
      embedding: number[],     // 1536 dimensions
      metadata: {
        heading?: string,
        section?: string,      // e.g., "h1", "h2"
        [key: string]: unknown
      }
    }
  ]
}
```

**`GET /health`**

Returns service health status and configuration.

#### Processing Pipeline

1. **PDF to Markdown Conversion**
   - Uses `pymupdf4llm` library
   - Optimized for LLM consumption
   - Preserves document structure

2. **Semantic Chunking**
   - Splits by markdown headers (H1-H6)
   - Respects 500 token limit per chunk
   - Falls back to paragraph/sentence splitting for large sections
   - Metadata includes heading text and section level

3. **Embedding Generation**
   - OpenAI `text-embedding-3-small` model
   - 1536-dimensional vectors
   - Batch processing with retry logic
   - Rate limit handling with exponential backoff

#### Security

The RAG microservice is protected with multiple security layers:

**1. API Key Authentication**

- All requests require a valid API key in the `X-API-Key` header
- API key is configured via `API_KEY` environment variable
- Only the Next.js server has access to the key (never exposed to browser)
- Invalid or missing keys return `403 Forbidden`

**2. Rate Limiting**

- Default: 10 requests per minute per IP address
- Configurable via `RATE_LIMIT` environment variable
- Prevents abuse and resource exhaustion
- Returns `429 Too Many Requests` when exceeded

**3. Server-to-Server Communication**

- API key is stored in Next.js server environment (`RAG_API_KEY`)
- Uses Next.js Server Actions (`"use server"` directive)
- Client never sees or handles the API key
- Network flow: `User Browser → Next.js Server → FastAPI`

**4. CORS Protection**

- Currently configured to allow all origins (development)
- **Production**: Update `allow_origins` to whitelist only your domain

**Request Flow:**

```
1. User uploads PDF in browser
2. Browser calls Next.js Server Action
3. Server Action reads RAG_API_KEY from environment
4. Server Action sends request to FastAPI with X-API-Key header
5. FastAPI validates key and rate limit
6. FastAPI processes PDF and returns chunks
7. Next.js inserts chunks to database
8. User sees success message
```

## Database Schema

### `documents` Table

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('syllabus', 'notes', 'other')),
  file_name TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- pgvector extension
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX idx_documents_embedding ON documents
USING ivfflat (embedding vector_cosine_ops);
```

### Metadata Structure

**For PDF documents (processed by RAG service):**

```json
{
  "heading": "Introduction to Machine Learning",
  "section": "h1"
}
```

**For text documents (processed locally):**

```json
{
  "originalName": "My Notes",
  "description": "Class notes from today",
  "originalLength": 5000,
  "chunkCount": 10,
  "tokenCount": 450,
  "startChar": 0,
  "endChar": 500,
  "savedAt": "2024-01-04T12:00:00.000Z"
}
```

## Configuration

### Next.js Environment Variables

**`.env.local`:**

```bash
# RAG Microservice
RAG_API_URL=http://localhost:8000
RAG_API_KEY=your_secure_api_key_here

# OpenAI API (for embeddings)
OPENAI_API_KEY=sk-proj-...

# Supabase
SUPABASE_DB_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...

# Redis Cache
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### RAG Microservice Environment Variables

**`student-os-rag/.env`:**

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...

# Embedding Model (must match Next.js setup)
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# Chunking Configuration (must match Next.js setup)
MAX_CHUNK_TOKENS=500
CHUNK_OVERLAP_TOKENS=50

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Security (REQUIRED)
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
API_KEY=your_secure_api_key_here

# Rate Limiting
RATE_LIMIT=10/minute
```

**Important:** The `API_KEY` must match between Next.js (`RAG_API_KEY`) and the RAG service (`API_KEY`).

## Setup Instructions

### Prerequisites

- Python 3.13+ (for RAG microservice)
- Node.js 18+ (for Next.js app)
- PostgreSQL with pgvector extension (Supabase)
- OpenAI API key

### 1. Setup RAG Microservice

```bash
cd student-os-rag

# Install dependencies
uv sync

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Run the service
python main.py

# Service will be available at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### 2. Configure Next.js App

```bash
cd student-os

# Environment is already configured in .env.local
# Ensure RAG_API_URL points to your microservice

# Install dependencies (if needed)
npm install

# Run the app
npm run dev
```

### 3. Verify Setup

1. **Check RAG service health:**

   ```bash
   curl http://localhost:8000/health
   ```

2. **Upload a test PDF:**
   - Go to a course page in StudentOS
   - Click "Upload Document"
   - Select a PDF file
   - Check the console logs in both services

## Usage

### Uploading Documents

#### PDF Documents

1. User uploads PDF through the UI (`DocumentUploadDialog`)
2. Next.js calls `uploadPdf()` action
3. Action sends PDF to RAG microservice
4. Microservice processes and returns chunks
5. Next.js stores chunks in Supabase
6. Document appears in document list

#### Text Documents

1. User enters text through the UI
2. Next.js calls `saveTextDocument()` action
3. Action chunks text locally
4. Action generates embeddings
5. Action stores chunks in Supabase
6. Document appears in document list

### Searching Documents

```typescript
import { searchDocuments } from "@/actions/documents/search-documents";

const results = await searchDocuments({
  query: "What is the syllabus policy on late submissions?",
  courseId: "uuid-here",
  topK: 5,
  similarityThreshold: 0.7,
});

// results contains the most relevant document chunks
```

### Integration with AI Chat

The chat system automatically uses document search as a tool:

**`app/api/chat/route.ts`:**

```typescript
// AI can call searchDocuments as a tool
const tools = {
  searchDocuments: {
    description: "Search through course documents",
    parameters: z.object({
      query: z.string(),
      courseId: z.string().optional(),
    }),
    execute: async ({ query, courseId }) => {
      const results = await searchDocuments({
        query,
        courseId,
        topK: 5,
      });
      return results;
    },
  },
};
```

## Data Flow Examples

### Example 1: PDF Upload

```
1. User uploads "syllabus.pdf" to Course A
   ↓
2. Next.js: uploadPdf({ file, courseId, documentType: "syllabus" })
   ↓
3. POST http://localhost:8000/process-pdf
   FormData: { file, user_id, file_name, document_type, course_id }
   ↓
4. RAG Service processes:
   - Converts PDF to markdown (15 pages)
   - Chunks by headers (creates 23 chunks)
   - Generates embeddings (23 x 1536 vectors)
   - Returns JSON with chunks
   ↓
5. Next.js receives response:
   {
     file_name: "syllabus.pdf",
     total_chunks: 23,
     chunks: [...]
   }
   ↓
6. Next.js inserts 23 rows into documents table
   ↓
7. User sees "syllabus.pdf (23 chunks)" in document list
```

### Example 2: Semantic Search

```
1. User asks in chat: "What's the grading policy?"
   ↓
2. AI decides to search documents
   ↓
3. searchDocuments({ query: "grading policy", courseId })
   ↓
4. Next.js generates embedding for "grading policy"
   ↓
5. PostgreSQL searches:
   SELECT content, 1 - (embedding <=> query_vector) as similarity
   FROM documents
   WHERE course_id = ? AND similarity > 0.7
   ORDER BY similarity DESC
   LIMIT 5
   ↓
6. Returns top 5 relevant chunks:
   [
     { content: "Grading Scale: A (90-100)...", similarity: 0.92 },
     { content: "Late policy: -10% per day...", similarity: 0.85 },
     ...
   ]
   ↓
7. AI uses chunks as context to answer question
```

## Performance Considerations

### Chunking Strategy

- **PDF documents**: Semantic chunking by headers
  - Preserves document structure
  - Better for academic/structured content
  - Metadata includes section hierarchy

- **Text documents**: Simple paragraph-based chunking
  - Faster processing
  - Good for unstructured notes
  - Simpler metadata

### Embedding Generation

- **Batch processing**: All chunks embedded concurrently
- **Retry logic**: 2 retries with exponential backoff
- **Rate limiting**: Automatic handling of OpenAI rate limits
- **Cost**: ~$0.00002 per 1K tokens (text-embedding-3-small)

### Database Optimization

- **Indexes**: ivfflat index on embedding column
- **Caching**: Upstash Redis with 60-second TTL
- **Connection pooling**: Supabase transaction mode

## Troubleshooting

### RAG Service Not Responding

**Symptom**: Upload fails with "Failed to process PDF with RAG service"

**Solutions**:

1. Check if RAG service is running:

   ```bash
   curl http://localhost:8000/health
   ```

2. Check RAG service logs:

   ```bash
   cd student-os-rag
   python main.py
   ```

3. Verify `RAG_API_URL` in Next.js `.env.local`

### PDF Conversion Fails

**Symptom**: "PDF conversion failed" error

**Solutions**:

1. Verify PDF is not corrupted or password-protected
2. Check RAG service logs for detailed error
3. Try converting PDF manually to test:
   ```python
   import pymupdf4llm
   import pymupdf
   doc = pymupdf.open("test.pdf")
   md = pymupdf4llm.to_markdown(doc)
   ```

### No Search Results

**Symptom**: Semantic search returns empty array

**Solutions**:

1. Lower similarity threshold:

   ```typescript
   searchDocuments({ query, similarityThreshold: 0.3 });
   ```

2. Check if documents exist:

   ```sql
   SELECT COUNT(*) FROM documents WHERE course_id = ?
   ```

3. Verify embeddings were generated:
   ```sql
   SELECT COUNT(*) FROM documents WHERE embedding IS NOT NULL
   ```

### Embedding Generation Fails

**Symptom**: "Embedding generation failed" error

**Solutions**:

1. Verify `OPENAI_API_KEY` is set correctly
2. Check OpenAI API quota/limits
3. Check network connectivity to OpenAI API
4. Review RAG service logs for rate limit errors

## Monitoring

### Key Metrics to Track

1. **RAG Service Health**
   - Uptime and availability
   - Average processing time per PDF
   - Error rate

2. **Document Statistics**
   - Total documents processed
   - Average chunks per document
   - Total embedding vectors stored

3. **Search Performance**
   - Average search latency
   - Search result relevance (similarity scores)
   - Cache hit rate

### Logging

**RAG Service Logs:**

```bash
# View real-time logs
cd student-os-rag
python main.py

# Logs show:
# - PDF conversion progress
# - Chunking statistics
# - Embedding generation status
# - Request/response details
```

**Next.js Logs:**

```bash
# Server actions log to console
# Check for:
# - Upload success/failure
# - RAG service errors
# - Database insertion status
```

## Future Improvements

### Planned Features

1. **Support for more file types**
   - Word documents (.docx)
   - PowerPoint presentations (.pptx)
   - Images with OCR

2. **Advanced chunking strategies**
   - Sliding window chunking
   - Contextual chunking with overlap
   - Hierarchical chunking

3. **Metadata enrichment**
   - Auto-detect document categories
   - Extract key terms/entities
   - Generate summaries

4. **Performance optimizations**
   - Caching processed documents
   - Incremental updates
   - Parallel processing

### Architecture Improvements

1. **Horizontal scaling**
   - Load balancer for RAG service
   - Multiple RAG service instances
   - Queue-based processing (Redis Bull)

2. **Monitoring & observability**
   - Prometheus metrics
   - Grafana dashboards
   - Error tracking (Sentry)

3. **Security enhancements**
   - API authentication (JWT)
   - Rate limiting per user
   - File size limits
   - Virus scanning

## References

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [pymupdf4llm Documentation](https://pymupdf.readthedocs.io/en/latest/pymupdf4llm/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Supabase Vector Documentation](https://supabase.com/docs/guides/ai/vector-columns)

## Support

For issues or questions:

1. Check this documentation first
2. Review error logs in both services
3. Test components individually (RAG service, embeddings, database)
4. Check environment configuration

---

**Last Updated**: January 2026
**Version**: 1.0.0
