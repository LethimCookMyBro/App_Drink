import assert from "node:assert/strict";
import test from "node:test";
import { GAME_MODES } from "../src/shared/config/gameConstants";
import { ICON_PATHS } from "../src/frontend/components/ui/iconPaths";

test("every GAME_MODE icon exists in the ICON_PATHS registry", () => {
  for (const mode of GAME_MODES) {
    assert.ok(
      mode.icon in ICON_PATHS,
      `Game mode "${mode.id}" references icon "${mode.icon}" which is not in ICON_PATHS`,
    );
  }
});

test("GAME_MODE icon type is a valid IconName (string key in ICON_PATHS)", () => {
  for (const mode of GAME_MODES) {
    assert.equal(
      typeof mode.icon,
      "string",
      `Game mode "${mode.id}" icon must be a string`,
    );
    assert.ok(
      mode.icon.length > 0,
      `Game mode "${mode.id}" icon must not be empty`,
    );
  }
});

test("no game mode uses a raw Material Symbol class name as icon", () => {
  const materialSymbolClasses = [
    "material-symbols-outlined",
    "material-symbols-rounded",
    "material-symbols-sharp",
  ];
  for (const mode of GAME_MODES) {
    for (const cls of materialSymbolClasses) {
      assert.ok(
        !mode.icon.includes(cls),
        `Game mode "${mode.id}" icon "${mode.icon}" looks like a Material Symbol class`,
      );
    }
  }
});
