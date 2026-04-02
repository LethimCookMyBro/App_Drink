"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: Record<string, unknown>,
      ) => string | number;
      reset: (widgetId?: string | number) => void;
      remove: (widgetId?: string | number) => void;
    };
  }
}

interface TurnstileWidgetProps {
  action: string;
  className?: string;
  onTokenChange: (token: string) => void;
  resetKey?: number;
  theme?: "auto" | "light" | "dark";
}

export function TurnstileWidget({
  action,
  className,
  onTokenChange,
  resetKey,
  theme = "dark",
}: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | number | null>(null);
  const lastResetKeyRef = useRef(resetKey);
  const [isReady, setIsReady] = useState(false);
  const handleTokenChange = useEffectEvent((token: string) => {
    onTokenChange(token);
  });

  const renderWidget = useEffectEvent(() => {
    if (!siteKey || !containerRef.current || !window.turnstile) {
      return;
    }

    if (widgetIdRef.current !== null) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }

    containerRef.current.innerHTML = "";
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      theme,
      callback: (token: string) => handleTokenChange(token),
      "expired-callback": () => handleTokenChange(""),
      "error-callback": () => handleTokenChange(""),
    });
  });

  useEffect(() => {
    if (typeof window !== "undefined" && window.turnstile) {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!siteKey || !isReady) {
      return;
    }

    renderWidget();

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, isReady, renderWidget, siteKey, theme]);

  useEffect(() => {
    if (
      resetKey === undefined ||
      lastResetKeyRef.current === resetKey ||
      widgetIdRef.current === null ||
      !window.turnstile
    ) {
      return;
    }

    lastResetKeyRef.current = resetKey;
    window.turnstile.reset(widgetIdRef.current);
    handleTokenChange("");
  }, [handleTokenChange, resetKey]);

  if (!siteKey) {
    return null;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setIsReady(true)}
      />
      <div className={className}>
        <div ref={containerRef} />
      </div>
    </>
  );
}
