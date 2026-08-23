import fs from "node:fs";
import path from "node:path";

const ROOTS = [
  path.resolve("src/app"),
  path.resolve("src/frontend/components"),
];

const IMPORT_LINE =
  'import { Icon } from "@/frontend/components/ui/Icon";\n';

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const spanRe =
  /<span([^>]*)>([\s\S]{0,120}?)<\/span>/g;

let totalReplaced = 0;
let filesTouched = 0;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    let source = fs.readFileSync(file, "utf8");
    const original = source;
    let replacedInFile = 0;

    source = source.replace(spanRe, (full, attrs, inner) => {
      if (!/material-symbols-outlined/.test(attrs)) return full;
      replacedInFile += 1;

      const classMatch = attrs.match(/className="([^"]*)"/);
      const cleanedClass = classMatch
        ? classMatch[1]
            .split(/\s+/)
            .filter(
              (cls) =>
                cls &&
                cls !== "material-symbols-outlined" &&
                cls !== "material-symbols-filled",
            )
            .join(" ")
        : "";

      const text = inner.replace(/<[^>]*>/g, "").trim();
      const isExpression = text.startsWith("{") && text.endsWith("}");
      const nameAttr = isExpression
        ? `name={${text.slice(1, -1).trim()}}`
        : `name="${text}"`;

      const filled = /material-symbols-filled/.test(attrs);
      const filledAttr = filled ? " filled" : "";

      const extraAttrs = attrs
        .replace(/\s*className="[^"]*"/, "")
        .replace(/\/$/, "")
        .trim();

      const classAttr = cleanedClass ? ` className="${cleanedClass}"` : "";
      const extraPart = extraAttrs ? ` ${extraAttrs}` : "";

      return `<Icon ${nameAttr}${filledAttr}${classAttr}${extraPart} />`;
    });

    if (replacedInFile === 0) continue;

    if (!source.includes('from "@/frontend/components/ui/Icon"')) {
      const importRegex = /^import[\s\S]*?from\s+["'][^"']+["'];\s*$/gm;
      let lastImportEnd = -1;
      let m;
      while ((m = importRegex.exec(source))) {
        lastImportEnd = m.index + m[0].length;
      }
      if (lastImportEnd === -1) {
        source = `${IMPORT_LINE}${source}`;
      } else {
        source =
          source.slice(0, lastImportEnd) +
          `\n${IMPORT_LINE}` +
          source.slice(lastImportEnd);
      }
    }

    fs.writeFileSync(file, source);
    totalReplaced += replacedInFile;
    filesTouched += 1;
    console.log(`${path.relative(process.cwd(), file)}: ${replacedInFile}`);
  }
}

console.log(`\nTotal: ${totalReplaced} icons in ${filesTouched} files`);
