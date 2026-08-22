/**
 * Postgres error classification.
 *
 * Drizzle wraps driver errors in its own `DrizzleQueryError` and hangs the
 * original off `.cause`, so a plain `error.code === "23505"` check silently
 * stopped matching and turned every duplicate-key conflict into a 500. Walk the
 * chain instead of reading one level.
 */

/** Postgres SQLSTATE for a unique-constraint violation. */
const UNIQUE_VIOLATION = "23505";

/** Postgres SQLSTATE for a foreign-key violation. */
const FOREIGN_KEY_VIOLATION = "23503";

function sqlState(error: unknown): string | undefined {
  let current: any = error;
  // Bounded so a self-referential cause chain cannot spin forever.
  for (let depth = 0; current && depth < 5; depth++) {
    if (typeof current.code === "string") return current.code;
    current = current.cause;
  }
  return undefined;
}

export function isUniqueViolation(error: unknown): boolean {
  return sqlState(error) === UNIQUE_VIOLATION;
}

export function isForeignKeyViolation(error: unknown): boolean {
  return sqlState(error) === FOREIGN_KEY_VIOLATION;
}
