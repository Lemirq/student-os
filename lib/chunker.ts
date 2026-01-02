export interface Chunk {
  text: string;
  index: number;
  tokenCount: number;
  metadata: {
    startChar: number;
    endChar: number;
  };
}

function estimateTokenCount(text: string): number {
  const wordCount = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  return Math.ceil(wordCount * 1.3);
}

function splitIntoSentences(
  text: string,
): Array<{ text: string; startChar: number; endChar: number }> {
  const sentences: Array<{ text: string; startChar: number; endChar: number }> =
    [];
  const sentenceRegex = /(?<=[.!?])\s+(?=[A-Z])/g;

  let start = 0;
  let match;

  while ((match = sentenceRegex.exec(text)) !== null) {
    const end = match.index + match[0].length;
    sentences.push({
      text: text.slice(start, match.index).trim(),
      startChar: start,
      endChar: match.index,
    });
    start = end;
  }

  if (start < text.length) {
    sentences.push({
      text: text.slice(start).trim(),
      startChar: start,
      endChar: text.length,
    });
  }

  return sentences.filter((s) => s.text.length > 0);
}

function splitIntoParagraphs(
  text: string,
): Array<{ text: string; startChar: number; endChar: number }> {
  const paragraphs: Array<{
    text: string;
    startChar: number;
    endChar: number;
  }> = [];
  const parts = text.split(/\n\s*\n/);

  let currentChar = 0;

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length === 0) continue;

    const startChar = text.indexOf(trimmed, currentChar);
    const endChar = startChar + trimmed.length;

    paragraphs.push({
      text: trimmed,
      startChar,
      endChar,
    });

    currentChar = endChar;
  }

  return paragraphs;
}

export async function chunkText(
  text: string,
  maxTokens: number = 500,
  overlapTokens: number = 50,
): Promise<Chunk[]> {
  const chunks: Chunk[] = [];

  const cleanedText = text.trim();
  if (cleanedText.length === 0) {
    return chunks;
  }

  const paragraphs = splitIntoParagraphs(cleanedText);

  let currentChunkText = "";
  let currentChunkStart = 0;
  let chunkIndex = 0;
  let overlapBuffer = "";

  for (const paragraph of paragraphs) {
    const paragraphText = paragraph.text;
    const paragraphTokens = estimateTokenCount(paragraphText);

    if (paragraphTokens > maxTokens) {
      if (currentChunkText.length > 0) {
        const currentTokens = estimateTokenCount(currentChunkText);
        chunks.push({
          text: currentChunkText,
          index: chunkIndex,
          tokenCount: currentTokens,
          metadata: {
            startChar: currentChunkStart,
            endChar: currentChunkStart + currentChunkText.length,
          },
        });
        chunkIndex++;

        const overlapWords = currentChunkText
          .split(/\s+/)
          .slice(-overlapTokens)
          .join(" ");
        overlapBuffer = overlapWords.length > 0 ? overlapWords + " " : "";
        currentChunkText = overlapBuffer;
        currentChunkStart =
          paragraphs[paragraphs.indexOf(paragraph) - 1]?.endChar -
            overlapBuffer.length || 0;
      }

      const sentences = splitIntoSentences(paragraphText);
      let sentenceChunk = "";
      let sentenceChunkStart = paragraph.startChar;

      for (const sentence of sentences) {
        const testChunk = sentenceChunk
          ? `${sentenceChunk} ${sentence.text}`
          : sentence.text;
        const testTokens = estimateTokenCount(testChunk);

        if (testTokens <= maxTokens) {
          sentenceChunk = testChunk;
        } else {
          if (sentenceChunk.length > 0) {
            const chunkTokens = estimateTokenCount(sentenceChunk);
            chunks.push({
              text: sentenceChunk,
              index: chunkIndex,
              tokenCount: chunkTokens,
              metadata: {
                startChar: sentenceChunkStart,
                endChar: sentenceChunkStart + sentenceChunk.length,
              },
            });
            chunkIndex++;

            const overlapWords = sentenceChunk
              .split(/\s+/)
              .slice(-overlapTokens)
              .join(" ");
            overlapBuffer = overlapWords.length > 0 ? overlapWords + " " : "";
            sentenceChunk = overlapBuffer;
            sentenceChunkStart = sentence.startChar - overlapBuffer.length;
          }

          const wordTokens = estimateTokenCount(sentence.text);
          if (wordTokens > maxTokens) {
            const words = sentence.text.split(/\s+/);
            let wordChunk = "";
            let wordChunkStart = sentence.startChar;

            for (const word of words) {
              const testWordChunk = wordChunk ? `${wordChunk} ${word}` : word;
              const testWordTokens = estimateTokenCount(testWordChunk);

              if (testWordTokens <= maxTokens) {
                wordChunk = testWordChunk;
              } else {
                if (wordChunk.length > 0) {
                  chunks.push({
                    text: wordChunk,
                    index: chunkIndex,
                    tokenCount: estimateTokenCount(wordChunk),
                    metadata: {
                      startChar: wordChunkStart,
                      endChar: wordChunkStart + wordChunk.length,
                    },
                  });
                  chunkIndex++;
                }

                wordChunk = word;
                wordChunkStart = sentence.text.indexOf(word, wordChunkStart);
              }
            }

            if (wordChunk.length > 0) {
              chunks.push({
                text: wordChunk,
                index: chunkIndex,
                tokenCount: estimateTokenCount(wordChunk),
                metadata: {
                  startChar: wordChunkStart,
                  endChar: wordChunkStart + wordChunk.length,
                },
              });
              chunkIndex++;

              const overlapWords = wordChunk
                .split(/\s+/)
                .slice(-overlapTokens)
                .join(" ");
              overlapBuffer = overlapWords.length > 0 ? overlapWords + " " : "";
            } else {
              overlapBuffer = "";
            }
          } else {
            sentenceChunk = sentence.text;
            sentenceChunkStart = sentence.startChar;
          }
        }
      }

      if (sentenceChunk.length > 0) {
        const chunkTokens = estimateTokenCount(sentenceChunk);
        chunks.push({
          text: sentenceChunk,
          index: chunkIndex,
          tokenCount: chunkTokens,
          metadata: {
            startChar: sentenceChunkStart,
            endChar: sentenceChunkStart + sentenceChunk.length,
          },
        });
        chunkIndex++;

        const overlapWords = sentenceChunk
          .split(/\s+/)
          .slice(-overlapTokens)
          .join(" ");
        overlapBuffer = overlapWords.length > 0 ? overlapWords + " " : "";
      }

      currentChunkText = overlapBuffer;
      currentChunkStart = paragraph.endChar - overlapBuffer.length;
    } else {
      const testChunk = currentChunkText
        ? `${currentChunkText}\n\n${paragraphText}`
        : paragraphText;
      const testTokens = estimateTokenCount(testChunk);

      if (testTokens <= maxTokens) {
        currentChunkText = testChunk;
        if (currentChunkText.startsWith(overlapBuffer)) {
          currentChunkStart = Math.min(currentChunkStart, paragraph.startChar);
        }
      } else {
        if (currentChunkText.length > 0) {
          const currentTokens = estimateTokenCount(currentChunkText);
          chunks.push({
            text: currentChunkText,
            index: chunkIndex,
            tokenCount: currentTokens,
            metadata: {
              startChar: currentChunkStart,
              endChar: currentChunkStart + currentChunkText.length,
            },
          });
          chunkIndex++;
        }

        const overlapWords = currentChunkText
          .split(/\s+/)
          .slice(-overlapTokens)
          .join(" ");
        overlapBuffer = overlapWords.length > 0 ? overlapWords + " " : "";
        currentChunkText = overlapBuffer + paragraphText;
        currentChunkStart = paragraph.startChar - overlapBuffer.length;
      }
    }
  }

  if (currentChunkText.length > 0) {
    const currentTokens = estimateTokenCount(currentChunkText);
    chunks.push({
      text: currentChunkText,
      index: chunkIndex,
      tokenCount: currentTokens,
      metadata: {
        startChar: currentChunkStart,
        endChar: currentChunkStart + currentChunkText.length,
      },
    });
  }

  return chunks;
}
