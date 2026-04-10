"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function getErrorMessage(value: unknown, fallback: string): string {
  if (
    value &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }

  return fallback;
}

export function useAdminRouteData<T>(path: string, fallbackError: string) {
  const router = useRouter();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(path, { cache: "no-store" });
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(getErrorMessage(payload, fallbackError));
        return;
      }

      setData(payload as T);
    } catch {
      setError(fallbackError);
    } finally {
      setLoading(false);
    }
  }, [fallbackError, path, router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh,
    setData,
  };
}
