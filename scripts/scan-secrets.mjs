import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const searchRoots = ["src", "prisma"];
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

const riskyPatterns = [
  /AIza[0-9A-Za-z-_]{35}/g,
  /sk-[A-Za-z0-9]{20,}/g,
  /ghp_[A-Za-z0-9]{20,}/g,
  /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/g,
  /\b(?:JWT_SECRET|ADMIN_JWT_SECRET|ROOM_JWT_SECRET|API_ENCRYPTION_KEY)\s*=\s*["'`][^"'`]{16,}/g,
];

function walk(dir) {
  const output = [];

  for (const entry of readdirSync(dir)) {
    const absolutePath = join(dir, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      output.push(...walk(absolutePath));
      continue;
    }

    if ([...allowedExtensions].some((extension) => absolutePath.endsWith(extension))) {
      output.push(absolutePath);
    }
  }

  return output;
}

const files = searchRoots.flatMap((directory) => walk(join(root, directory)));
const findings = [];

for (const absolutePath of files) {
  const content = readFileSync(absolutePath, "utf8");

  for (const pattern of riskyPatterns) {
    if (pattern.test(content)) {
      findings.push(relative(root, absolutePath));
      break;
    }
  }
}

if (findings.length > 0) {
  console.error("Potential hardcoded secrets detected:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("No obvious hardcoded secrets found.");
