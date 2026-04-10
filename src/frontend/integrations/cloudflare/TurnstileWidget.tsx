"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Script from "next/script";
import {
  TURNSTILE_SCRIPT_SRC,
  type TurnstileAction,
} from "@/shared/integrations/cloudflareTurnstile";

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
  action: TurnstileAction;
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
  const isDevelopment = process.env.NODE_ENV !== "production";
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | number | null>(null);
  const lastResetKeyRef = useRef(resetKey);
  const [isReady, setIsReady] = useState(
    () => typeof window !== "undefined" && !!window.turnstile,
  );
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

    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
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
  }, [action, isReady, siteKey, theme]);

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
  }, [resetKey]);

  if (!siteKey) {
    if (!isDevelopment) {
      return null;
    }

    return (
      <div
        className={[
          "rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <p className="font-semibold">Turnstile ยังไม่ถูกเปิดใช้</p>
        <p className="mt-1 text-amber-50/80">
          ตั้งค่า <code>NEXT_PUBLIC_TURNSTILE_SITE_KEY</code> และรีสตาร์ต dev
          server แล้ว widget ของ Cloudflare จะขึ้นในฟอร์มนี้
        </p>
      </div>
    );
  }

  const showLoadingState = !isReady;

  if (showLoadingState) {
    return (
      <>
        <Script
          src={TURNSTILE_SCRIPT_SRC}
          strategy="afterInteractive"
          onReady={() => setIsReady(true)}
        />
        <div className={className}>
          <div className="flex min-h-24 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
            <div className="flex items-center gap-3">
              <div className="size-4 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
              <span>กำลังโหลด Cloudflare Turnstile...</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Script
        src={TURNSTILE_SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={() => setIsReady(true)}
      />
      <div className={className}>
        <div className="flex justify-center">
          <div ref={containerRef} />
        </div>
      </div>
    </>
  );
}
