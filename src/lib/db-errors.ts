// Postgres SQLSTATE error codes we handle specially in server actions.
// https://www.postgresql.org/docs/current/errcodes-appendix.html
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

function getPgErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;

  if ("code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }

  // Drizzle wraps the underlying driver error (which carries the Postgres
  // SQLSTATE `code`) in a DrizzleQueryError, exposing it as `.cause`.
  if ("cause" in error) {
    return getPgErrorCode((error as { cause?: unknown }).cause);
  }

  return undefined;
}

export function isUniqueViolation(error: unknown): boolean {
  return getPgErrorCode(error) === UNIQUE_VIOLATION;
}

export function isForeignKeyViolation(error: unknown): boolean {
  return getPgErrorCode(error) === FOREIGN_KEY_VIOLATION;
}
