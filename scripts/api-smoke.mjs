import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.API_BASE_URL || "http://127.0.0.1:3003";

function readEnvFile(filePath) {
  const env = {};
  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function buildCookieHeader(cookieJar) {
  return Object.entries(cookieJar)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function mergeCookies(cookieJar, response) {
  const setCookie =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];

  for (const entry of setCookie) {
    const [pair] = entry.split(";");
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = pair.slice(0, separatorIndex);
    const value = pair.slice(separatorIndex + 1);
    cookieJar[key] = value;
  }
}

async function request(pathname, options = {}, cookieJar) {
  const headers = new Headers(options.headers || {});
  if (cookieJar && Object.keys(cookieJar).length > 0) {
    headers.set("cookie", buildCookieHeader(cookieJar));
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers,
  });

  if (cookieJar) {
    mergeCookies(cookieJar, response);
  }

  const text = await response.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 160);
  }

  return {
    status: response.status,
    body,
  };
}

const env = readEnvFile(path.join(process.cwd(), ".env"));
const originHeaders = {
  Origin: new URL(baseUrl).origin,
  "Content-Type": "application/json",
};

const report = {};
const adminJar = {};
const roomHostJar = {};
const roomPlayerJar = {};

report.authMeAnon = await request("/api/auth/me");
report.profileAnon = await request("/api/user/profile");
report.historyAnon = await request("/api/user/history");
report.adminVerifyAnon = await request("/api/admin/verify");
report.feedbackAnon = await request("/api/feedback");
report.roomsAnon = await request("/api/rooms");
report.randomQuestions = await request("/api/questions/random?count=2&type=QUESTION");

report.adminLogin = await request(
  "/api/admin/login",
  {
    method: "POST",
    headers: originHeaders,
    body: JSON.stringify({
      username: env.ADMIN_SEED_USERNAME,
      password: env.ADMIN_SEED_PASSWORD,
    }),
  },
  adminJar,
);

report.adminVerifyAuthed = await request("/api/admin/verify", {}, adminJar);
report.adminQuestions = await request(
  "/api/questions?limit=3&offset=0",
  {},
  adminJar,
);

report.createRoom = await request(
  "/api/rooms",
  {
    method: "POST",
    headers: originHeaders,
    body: JSON.stringify({
      hostName: "API Host",
      roomName: "API Audit",
      maxPlayers: 5,
      difficulty: 2,
      is18Plus: false,
    }),
  },
  roomHostJar,
);

const roomCode = report.createRoom.body?.room?.code;
if (roomCode) {
  report.getRoomAsHost = await request(`/api/rooms/${roomCode}`, {}, roomHostJar);
  report.startRoom = await request(
    `/api/rooms/${roomCode}/start`,
    {
      method: "POST",
      headers: originHeaders,
      body: JSON.stringify({ mode: "QUESTION" }),
    },
    roomHostJar,
  );
  report.startRoomAgain = await request(
    `/api/rooms/${roomCode}/start`,
    {
      method: "POST",
      headers: originHeaders,
      body: JSON.stringify({ mode: "QUESTION" }),
    },
    roomHostJar,
  );
  report.joinRoom = await request(
    `/api/rooms/${roomCode}/join`,
    {
      method: "POST",
      headers: originHeaders,
      body: JSON.stringify({ playerName: "API Guest" }),
    },
    roomPlayerJar,
  );
  report.joinRoomDuplicate = await request(
    `/api/rooms/${roomCode}/join`,
    {
      method: "POST",
      headers: originHeaders,
      body: JSON.stringify({ playerName: "API Guest" }),
    },
    roomPlayerJar,
  );
  report.getRoomAsGuest = await request(
    `/api/rooms/${roomCode}`,
    {},
    roomPlayerJar,
  );
}

console.log(JSON.stringify(report, null, 2));
