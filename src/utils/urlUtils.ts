/**
 * URL Utilities for Autonomous AI QA Engineer
 * Pure functions safe to run in both Node.js server and Browser client.
 */

export function canonicalizeTargetUrl(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function isValidHttpUrl(input: string): boolean {
  try {
    const url = new URL(canonicalizeTargetUrl(input));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
