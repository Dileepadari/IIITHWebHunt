import { ApiError } from "./queryClient";

/** True when a failure means the session is gone and the user must sign in again. */
export function isUnauthorizedError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 401;
  // Fallback for errors raised outside apiRequest.
  return error instanceof Error && /^401[:\s]/.test(error.message);
}
