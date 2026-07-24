import { NextResponse } from "next/server";

interface RateLimitStore {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitStore>();

// Clean up stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of store.entries()) {
      if (now > value.resetAt) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  limit: number;      // Maximum requests
  windowMs: number;   // Time window in milliseconds
}

/**
 * In-memory sliding window rate limiter for Next.js API routes.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 60, windowMs: 60_000 }
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const key = identifier;
  const current = store.get(key);

  if (!current || now > current.resetAt) {
    const resetAt = now + options.windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      reset: Math.ceil(resetAt / 1000),
    };
  }

  if (current.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      reset: Math.ceil(current.resetAt / 1000),
    };
  }

  current.count += 1;
  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - current.count,
    reset: Math.ceil(current.resetAt / 1000),
  };
}

/**
 * Helper response generator for rate limited requests (429 Too Many Requests)
 */
export function rateLimitExceededResponse(resetTimestampSeconds: number) {
  const response = NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429 }
  );
  response.headers.set("Retry-After", String(Math.max(1, resetTimestampSeconds - Math.floor(Date.now() / 1000))));
  return response;
}
