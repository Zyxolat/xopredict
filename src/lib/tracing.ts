import { NextRequest } from "next/server";

export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Generate a unique correlation request ID
 */
export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extract or generate Request ID from Next.js incoming request
 */
export function getOrCreateRequestId(request?: NextRequest | Request | null): string {
  if (request) {
    const existing = request.headers.get(REQUEST_ID_HEADER);
    if (existing && existing.trim().length > 0) {
      return existing.trim();
    }
  }
  return generateRequestId();
}
