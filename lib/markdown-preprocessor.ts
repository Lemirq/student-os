export function preprocessMarkdown(markdown: string): string {
  let processed = markdown.replace(/\(\((.*?)\)\)/g, "$$$1$$");
  processed = processed.replace(/\\\((.*?)\\\)/g, "$$$1$$");
  return processed;
}
