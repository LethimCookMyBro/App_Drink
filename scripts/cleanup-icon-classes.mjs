import fs from "node:fs";

const files = [
  "src/app/(frontend)/settings/page.tsx",
  "src/frontend/components/ui/BottomNav.tsx",
  "src/app/(frontend)/decks/page.tsx",
  "src/app/(frontend)/admin/questions/page.tsx",
  "src/app/(frontend)/game/modes/page.tsx",
  "src/app/(frontend)/game/play/page.tsx",
  "src/app/(frontend)/game/wheel/page.tsx",
];

for (const file of files) {
  let source = fs.readFileSync(file, "utf8");
  const before = source;

  source = source.replaceAll(
    '${"material-symbols-outlined" }',
    "",
  );
  source = source.replaceAll("${\"material-symbols-outlined\"}", "");
  source = source.replaceAll(" material-symbols-outlined ", " ");
  source = source.replaceAll("material-symbols-outlined ", "");
  source = source.replaceAll(" material-symbols-filled", "");

  if (source !== before) {
    fs.writeFileSync(file, source);
    console.log(`cleaned: ${file}`);
  }
}
