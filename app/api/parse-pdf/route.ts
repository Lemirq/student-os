import { NextResponse } from "next/server";
import PDFParser from "pdf2json";

export async function POST(req: Request) {
  try {
    const { fileUrl } = await req.json();

    if (!fileUrl || typeof fileUrl !== "string") {
      return NextResponse.json(
        { error: "Invalid fileUrl provided" },
        { status: 400 },
      );
    }

    if (!fileUrl.startsWith("data:application/pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 },
      );
    }

    const base64Data = fileUrl.split(",")[1];
    if (!base64Data) {
      return NextResponse.json(
        { error: "Invalid data URL format" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(base64Data, "base64");

    const pdfParser = new PDFParser();

    const text = await new Promise<string>((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData) =>
        reject(
          new Error((errData as { parserError: Error }).parserError.message),
        ),
      );
      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        try {
          // Manual text extraction to avoid getRawTextContent() bugs
          let extractedText = "";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pdfData.Pages.forEach((page: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            page.Texts.forEach((textItem: any) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              textItem.R.forEach((r: any) => {
                try {
                  extractedText += decodeURIComponent(r.T) + " ";
                } catch {
                  extractedText += r.T + " ";
                }
              });
            });
            extractedText += "\n\n";
          });
          resolve(extractedText);
        } catch (err) {
          reject(err);
        }
      });

      pdfParser.parseBuffer(buffer);
    });

    return NextResponse.json({ text });
  } catch (error) {
    console.error("PDF Parse Error:", error);
    // @ts-expect-error - error type is unknown
    const errorMessage = error?.message || "Unknown error";
    return NextResponse.json(
      { error: "Failed to parse PDF content: " + errorMessage },
      { status: 500 },
    );
  }
}
