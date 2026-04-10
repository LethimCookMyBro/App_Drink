export const TURNSTILE_SITE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const TURNSTILE_ACTIONS = {
  adminLogin: "admin_login",
  authLogin: "login",
  authRegister: "register",
  feedbackCreate: "feedback",
} as const;

export type TurnstileAction =
  (typeof TURNSTILE_ACTIONS)[keyof typeof TURNSTILE_ACTIONS];

export interface TurnstileSiteVerifyResponse {
  success: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
}
