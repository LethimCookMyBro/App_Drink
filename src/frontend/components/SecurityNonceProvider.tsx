"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

const SecurityNonceContext = createContext<string | null>(null);

export function SecurityNonceProvider({
  nonce,
  children,
}: {
  nonce: string | null;
  children: ReactNode;
}) {
  return (
    <SecurityNonceContext.Provider value={nonce}>
      {children}
    </SecurityNonceContext.Provider>
  );
}

export function useSecurityNonce(): string | undefined {
  return useContext(SecurityNonceContext) ?? undefined;
}
