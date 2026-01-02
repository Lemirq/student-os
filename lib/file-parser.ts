import { parsePDF } from "@/lib/pdf-parser";

export interface FileParseResult {
  text: string;
  metadata: FileMetadata;
  fileType: "pdf" | "markdown" | "text";
}

export interface FileMetadata {
  fileName?: string;
  fileSize?: number;
  pageCount?: number;
  title?: string;
  author?: string;
  creationDate?: Date;
}

export class FileParseError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_FILE" | "UNSUPPORTED_FILE" | "PARSE_ERROR",
  ) {
    super(message);
    this.name = "FileParseError";
  }
}

function getFileExtension(fileName: string): string {
  return fileName.toLowerCase().slice(fileName.lastIndexOf("."));
}

function parseMarkdownFrontmatter(text: string): Record<string, string> {
  const frontmatter: Record<string, string> = {};

  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = text.match(frontmatterRegex);

  if (match && match[1]) {
    const lines = match[1].split("\n");
    for (const line of lines) {
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        frontmatter[key] = value;
      }
    }
  }

  return frontmatter;
}

async function parseTextFile(
  buffer: Buffer,
  fileName: string,
  fileType: "markdown" | "text",
): Promise<FileParseResult> {
  const text = buffer.toString("utf-8");

  if (text.trim().length === 0) {
    throw new FileParseError("File contains no text content", "INVALID_FILE");
  }

  const metadata: FileMetadata = {
    fileName,
    fileSize: buffer.length,
  };

  if (fileType === "markdown") {
    const frontmatter = parseMarkdownFrontmatter(text);
    if (frontmatter.title) {
      metadata.title = frontmatter.title;
    }
    if (frontmatter.author) {
      metadata.author = frontmatter.author;
    }
    if (frontmatter.date) {
      metadata.creationDate = new Date(frontmatter.date);
    }

    return {
      text,
      metadata,
      fileType: "markdown",
    };
  }

  return {
    text,
    metadata,
    fileType: "text",
  };
}

export async function parseFile(
  buffer: Buffer,
  fileName: string,
): Promise<FileParseResult> {
  if (!Buffer.isBuffer(buffer)) {
    throw new FileParseError("Input must be a Buffer", "INVALID_FILE");
  }

  if (buffer.length === 0) {
    throw new FileParseError("Buffer is empty", "INVALID_FILE");
  }

  const extension = getFileExtension(fileName);

  switch (extension) {
    case ".pdf": {
      const pdfResult = await parsePDF(buffer);
      return {
        text: pdfResult.text,
        metadata: {
          fileName,
          fileSize: buffer.length,
          pageCount: pdfResult.pageCount,
          title: pdfResult.metadata.title,
          author: pdfResult.metadata.author,
          creationDate: pdfResult.metadata.creationDate,
        },
        fileType: "pdf",
      };
    }

    case ".md":
    case ".markdown":
      return parseTextFile(buffer, fileName, "markdown");

    case ".txt":
    case ".text":
      return parseTextFile(buffer, fileName, "text");

    default:
      throw new FileParseError(
        `Unsupported file type: ${extension}`,
        "UNSUPPORTED_FILE",
      );
  }
}

export async function extractTextFromFile(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const result = await parseFile(buffer, fileName);
  return result.text;
}

export async function getFileMetadata(
  buffer: Buffer,
  fileName: string,
): Promise<FileMetadata> {
  const result = await parseFile(buffer, fileName);
  return result.metadata;
}

export function isValidFileType(fileName: string): boolean {
  const extension = getFileExtension(fileName);
  const validExtensions = [".pdf", ".md", ".markdown", ".txt", ".text"];
  return validExtensions.includes(extension);
}
