import { getPath } from "pdf-parse/worker";
import { PDFParse, PasswordException } from "pdf-parse";

PDFParse.setWorker(getPath());

export interface PDFParseResult {
  text: string;
  pageCount: number;
  metadata: PDFMetadata;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

export class PDFParseError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_PDF" | "PASSWORD_PROTECTED" | "PARSE_ERROR",
  ) {
    super(message);
    this.name = "PDFParseError";
  }
}

export async function parsePDF(buffer: Buffer): Promise<PDFParseResult> {
  if (!Buffer.isBuffer(buffer)) {
    throw new PDFParseError("Input must be a Buffer", "INVALID_PDF");
  }

  if (buffer.length === 0) {
    throw new PDFParseError("Buffer is empty", "INVALID_PDF");
  }

  const pdfHeader = buffer.toString("ascii", 0, 4);
  if (pdfHeader !== "%PDF") {
    throw new PDFParseError("Invalid PDF file header", "INVALID_PDF");
  }

  try {
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();
    await parser.destroy();

    const pageCount = textResult.total || 0;

    const info = infoResult.info as Record<string, unknown> | undefined;

    const metadata: PDFMetadata = {
      title: info?.Title as string | undefined,
      author: info?.Author as string | undefined,
      subject: info?.Subject as string | undefined,
      keywords: info?.Keywords as string | undefined,
      creator: info?.Creator as string | undefined,
      producer: info?.Producer as string | undefined,
      creationDate: parsePDFDate(info?.CreationDate as string | undefined),
      modificationDate: parsePDFDate(info?.ModDate as string | undefined),
    };

    return {
      text: textResult.text,
      pageCount,
      metadata,
    };
  } catch (error) {
    if (error instanceof PasswordException) {
      throw new PDFParseError(
        "PDF is password-protected",
        "PASSWORD_PROTECTED",
      );
    }

    if (error instanceof Error) {
      if (
        error.message.includes("password") ||
        error.message.includes("encrypted")
      ) {
        throw new PDFParseError(
          "PDF is password-protected",
          "PASSWORD_PROTECTED",
        );
      }

      if (error.message.includes("Invalid PDF")) {
        throw new PDFParseError("Invalid PDF file", "INVALID_PDF");
      }

      throw new PDFParseError(
        `Failed to parse PDF: ${error.message}`,
        "PARSE_ERROR",
      );
    }

    throw new PDFParseError("Unknown error parsing PDF", "PARSE_ERROR");
  }
}

function parsePDFDate(dateString: string | undefined): Date | undefined {
  if (!dateString) return undefined;

  const pdfDateRegex = /^D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/;
  const match = dateString.match(pdfDateRegex);

  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  }

  const jsDate = new Date(dateString);
  return isNaN(jsDate.getTime()) ? undefined : jsDate;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const result = await parsePDF(buffer);
  return result.text;
}

export async function extractPDFMetadata(buffer: Buffer): Promise<PDFMetadata> {
  const result = await parsePDF(buffer);
  return result.metadata;
}

export async function isValidPDF(buffer: Buffer): Promise<boolean> {
  try {
    await parsePDF(buffer);
    return true;
  } catch (error) {
    return error instanceof PDFParseError && error.code === "PASSWORD_PROTECTED"
      ? true
      : false;
  }
}
