const HTML_TAG_PATTERN = /<[^>]*>/g;
const SCRIPT_KEYWORD_PATTERN =
  /\b(script|javascript:|data:text\/html|onerror|onload|iframe|document\.cookie|window\.location)\b/gi;
const NULL_BYTE_PATTERN = /\0/g;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function sanitize(input: string, maxLength = 500): string {
  return normalizeWhitespace(
    input
      .normalize("NFKC")
      .replace(NULL_BYTE_PATTERN, "")
      .replace(HTML_TAG_PATTERN, "")
      .replace(SCRIPT_KEYWORD_PATTERN, ""),
  ).slice(0, maxLength);
}

export function containsDangerousHtml(input: string): boolean {
  return HTML_TAG_PATTERN.test(input) || SCRIPT_KEYWORD_PATTERN.test(input);
}

export function sanitizeOptional(input: unknown, maxLength = 500): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const sanitized = sanitize(input, maxLength);
  return sanitized.length > 0 ? sanitized : null;
}

export default sanitize;
