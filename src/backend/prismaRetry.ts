import { Prisma } from "@prisma/client";

const MAX_SERIALIZABLE_RETRY_ATTEMPTS = 4;

function isPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

export function isUniqueConstraintError(error: unknown): boolean {
  return isPrismaErrorCode(error, "P2002");
}

export async function withSerializableRetry<T>(
  fn: () => Promise<T>,
  errorMessage = "Could not complete transaction",
): Promise<T> {
  let attempt = 0;

  while (attempt < MAX_SERIALIZABLE_RETRY_ATTEMPTS) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (!isPrismaErrorCode(error, "P2034")) {
        throw error;
      }

      if (attempt >= MAX_SERIALIZABLE_RETRY_ATTEMPTS) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 15 * 2 ** attempt));
    }
  }

  throw new Error(errorMessage);
}
