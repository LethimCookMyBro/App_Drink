import jwt from "jsonwebtoken";
import env from "@/backend/env";

export type GoogleSheetCell = string | number | boolean;

export interface GoogleSheetTab {
  title: string;
  values: GoogleSheetCell[][];
}

export interface GoogleSheetsSyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  tabsUpdated: number;
}

export class GoogleSheetsConfigurationError extends Error {}
export class GoogleSheetsRequestError extends Error {}

const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const GOOGLE_TOKEN_AUDIENCE = "https://oauth2.googleapis.com/token";

function assertGoogleSheetsConfigured(): void {
  if (env.googleSheetsEnabled) {
    return;
  }

  throw new GoogleSheetsConfigurationError(
    "Google Sheets export ยังไม่ได้ตั้งค่าใน environment",
  );
}

function buildSheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

function toSheetRange(title: string, cellRange: string): string {
  return `'${title.replace(/'/g, "''")}'!${cellRange}`;
}

async function getGoogleSheetsAccessToken(): Promise<string> {
  assertGoogleSheetsConfigured();

  const issuedAt = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: env.googleSheetsClientEmail,
      scope: GOOGLE_SHEETS_SCOPE,
      aud: GOOGLE_TOKEN_AUDIENCE,
      iat: issuedAt,
      exp: issuedAt + 3600,
    },
    env.googleSheetsPrivateKey,
    { algorithm: "RS256" },
  );

  const response = await fetch(GOOGLE_TOKEN_AUDIENCE, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token) {
    throw new GoogleSheetsRequestError(
      payload?.error_description ||
        payload?.error ||
        "ขอ access token จาก Google ไม่สำเร็จ",
    );
  }

  return payload.access_token as string;
}

async function googleSheetsRequest<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`https://sheets.googleapis.com/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (response.status === 204) {
    return null as T;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      payload?.error?.message ||
      payload?.error_description ||
      payload?.error ||
      "เรียก Google Sheets API ไม่สำเร็จ";
    throw new GoogleSheetsRequestError(detail);
  }

  return payload as T;
}

async function ensureSpreadsheetTabs(
  accessToken: string,
  spreadsheetId: string,
  titles: string[],
): Promise<void> {
  const metadata = await googleSheetsRequest<{
    sheets?: Array<{ properties?: { title?: string } }>;
  }>(
    accessToken,
    `/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    { method: "GET" },
  );

  const existingTitles = new Set(
    (metadata.sheets || [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title)),
  );

  const addSheetRequests = titles
    .filter((title) => !existingTitles.has(title))
    .map((title) => ({
      addSheet: {
        properties: {
          title,
        },
      },
    }));

  if (!addSheetRequests.length) {
    return;
  }

  await googleSheetsRequest(
    accessToken,
    `/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({ requests: addSheetRequests }),
    },
  );
}

export async function syncGoogleSheetTabs(
  tabs: GoogleSheetTab[],
): Promise<GoogleSheetsSyncResult> {
  assertGoogleSheetsConfigured();

  const spreadsheetId = env.googleSheetsSpreadsheetId;
  const accessToken = await getGoogleSheetsAccessToken();
  const titles = [...new Set(tabs.map((tab) => tab.title))];

  await ensureSpreadsheetTabs(accessToken, spreadsheetId, titles);

  for (const tab of tabs) {
    await googleSheetsRequest(
      accessToken,
      `/spreadsheets/${spreadsheetId}/values:batchClear`,
      {
        method: "POST",
        body: JSON.stringify({
          ranges: [toSheetRange(tab.title, "A:ZZZ")],
        }),
      },
    );

    await googleSheetsRequest(
      accessToken,
      `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        toSheetRange(tab.title, "A1"),
      )}?valueInputOption=RAW`,
      {
        method: "PUT",
        body: JSON.stringify({
          majorDimension: "ROWS",
          values: tab.values,
        }),
      },
    );
  }

  return {
    spreadsheetId,
    spreadsheetUrl: buildSheetUrl(spreadsheetId),
    tabsUpdated: tabs.length,
  };
}
