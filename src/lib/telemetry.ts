export interface SpanOptions {
  name: string;
  attributes?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Lightweight OpenTelemetry span wrapper utility.
 * Wraps async handlers in telemetry spans and calculates duration metrics.
 */
export async function withSpan<T>(
  options: SpanOptions,
  fn: (spanId: string) => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const spanId = `span_${startTime}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    const result = await fn(spanId);
    const duration = Date.now() - startTime;
    if (process.env.ENABLE_OTEL_CONSOLE_LOGS === "true") {
      console.log(
        JSON.stringify({
          telemetry: "span",
          name: options.name,
          spanId,
          durationMs: duration,
          attributes: options.attributes,
        })
      );
    }
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      JSON.stringify({
        telemetry: "span_error",
        name: options.name,
        spanId,
        durationMs: duration,
        error: error instanceof Error ? error.message : String(error),
        attributes: options.attributes,
      })
    );
    throw error;
  }
}
