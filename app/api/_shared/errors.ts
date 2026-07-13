import { NextResponse } from "next/server";

/**
 * Consistent JSON error shape for all Route Handlers:
 *   { error: string, code?: string }
 */
export type ApiErrorBody = {
  error: string;
  code?: string;
};

/** Standard HTTP status codes used across the API for `apiError`. */
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Builds a JSON error response with a consistent shape.
 *
 * @example
 *   return apiError("Lead not found", HTTP_STATUS.NOT_FOUND, "LEAD_NOT_FOUND");
 */
export function apiError(
  message: string,
  status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  code?: string
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: message, code }, { status });
}

/**
 * Wraps a Route Handler body so unexpected thrown errors become a
 * consistent 500 JSON response instead of an unhandled exception /
 * Next.js default error page. Known errors should still be returned
 * explicitly via `apiError` for correct status codes.
 *
 * @example
 *   export const GET = withErrorHandling(async (request) => {
 *     const data = await mightThrow();
 *     return NextResponse.json(data);
 *   });
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("[api] Unhandled error:", err);
      return apiError("Internal server error", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };
}
