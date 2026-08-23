export type SecurityPostureTone = "good" | "warn" | "default";

export interface SecurityPostureInput {
  turnstileConfigured: boolean;
  googleLoginEnabled: boolean;
  googleSheetsEnabled: boolean;
  allowedOriginsCount: number;
  allowedOriginsPreview: string;
  isProduction: boolean;
  trustProxyIpHeaders: boolean;
}

export interface SecurityPostureItem {
  label: string;
  value: string;
  tone: SecurityPostureTone;
  /** true only when the app actually verified this at runtime/startup */
  checked: boolean;
}

/**
 * Builds the admin security configuration list. Every item must honestly say
 * whether it was actually verified — never render a green "healthy" state for
 * something that was not checked.
 */
export function buildSecurityPosture(input: SecurityPostureInput): Array<{
  group: "auth" | "web" | "integrations";
  items: SecurityPostureItem[];
}> {
  return [
    {
      group: "auth",
      items: [
        {
          label: "Turnstile",
          value: input.turnstileConfigured ? "เปิดใช้งาน" : "ยังไม่ตั้งค่า",
          tone: input.turnstileConfigured ? "good" : "warn",
          checked: true,
        },
        {
          label: "Google Login",
          value: input.googleLoginEnabled ? "พร้อมใช้งาน" : "ปิดอยู่",
          tone: "default",
          checked: true,
        },
        {
          label: "Secrets Policy",
          value: input.isProduction
            ? "ผ่านการตรวจสอบตอนเริ่มระบบ (≥32 ตัวอักษร และแยกกัน)"
            : "โหมดพัฒนา — ใช้ fallback secret",
          tone: input.isProduction ? "good" : "warn",
          // Startup validation runs only in production, so outside production
          // this was NOT verified and must not be shown as healthy.
          checked: input.isProduction,
        },
      ],
    },
    {
      group: "web",
      items: [
        {
          label: "Allowed Origins",
          value:
            input.allowedOriginsCount > 0
              ? `${input.allowedOriginsCount} origin${input.allowedOriginsPreview ? ` (${input.allowedOriginsPreview})` : ""}`
              : "ไม่ได้ตั้งค่า",
          tone: input.allowedOriginsCount > 0 ? "good" : "warn",
          checked: true,
        },
        {
          label: "Session Cookies",
          // Be honest about the mixed policy in this codebase:
          //   - `auth-token`, `admin-token`, `room-host-token`, `room-player-token`
          //     are issued via buildSessionCookieOptions, which defaults to
          //     `SameSite=Strict` + `HttpOnly` + `Secure` in production.
          //   - NextAuth's `__Secure-next-auth.session-token` /
          //     `next-auth.session-token` are cleared with `SameSite=Lax`
          //     (see clearNextAuthSessionCookies) and NextAuth v4's
          //     default is also `Lax`.
          // `checked: false` because we never read the actual Set-Cookie
          // header at startup, so we cannot claim this is runtime-verified.
          value: `HttpOnly • SameSite=Strict (app/room/admin) + SameSite=Lax (NextAuth) • ${
            input.isProduction ? "Secure (production)" : "ไม่มี Secure (dev)"
          }`,
          tone: "default",
          checked: false,
        },
        {
          label: "Trust Proxy IP Headers",
          value: input.trustProxyIpHeaders ? "เปิดใช้" : "ปิดอยู่",
          tone: "default",
          checked: true,
        },
      ],
    },
    {
      group: "integrations",
      items: [
        {
          label: "Google Sheets Export",
          value: input.googleSheetsEnabled ? "พร้อมใช้งาน" : "ยังไม่ตั้งค่า",
          tone: input.googleSheetsEnabled ? "good" : "warn",
          checked: true,
        },
      ],
    },
  ];
}
