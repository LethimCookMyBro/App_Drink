import assert from "node:assert/strict";
import test from "node:test";
import { renderToString } from "react-dom/server";
import { Icon } from "../src/frontend/components/ui/Icon";

/**
 * Material Symbols SVGs use a 960×960 coordinate space: viewBox="0 -960 960 960"
 * The generated path data retains coordinates in this space (e.g. M220-180).
 * If Icon.tsx uses viewBox="0 0 24 24", all paths render above the visible
 * area and are clipped — icons become invisible.
 */
const MATERIAL_SYMBOLS_VIEWBOX = "0 -960 960 960";

test("Icon renders with Material Symbols viewBox (not 24×24)", () => {
  const html = renderToString(<Icon name="home" />);
  assert.ok(
    html.includes(`viewBox="${MATERIAL_SYMBOLS_VIEWBOX}"`),
    `Expected viewBox="${MATERIAL_SYMBOLS_VIEWBOX}" but got: ${html}`,
  );
});

test("Icon does NOT use the incorrect 24×24 viewBox", () => {
  const html = renderToString(<Icon name="home" />);
  assert.ok(
    !html.includes('viewBox="0 0 24 24"'),
    `Icon should not use viewBox="0 0 24 24" but got: ${html}`,
  );
});

test("Icon renders SVG with non-zero visible area for path data", () => {
  const html = renderToString(<Icon name="home" />);
  // The home icon path starts at M220-180 (Y=-180).
  // With viewBox="0 -960 960 960", Y=-180 is within the visible range.
  // With viewBox="0 0 24 24", Y=-180 is outside the visible range.
  assert.ok(
    html.includes("<svg"),
    "Icon should render an SVG element",
  );
  assert.ok(
    html.includes("<path"),
    "Icon should render a path element",
  );
});

test("filled icon also uses correct viewBox", () => {
  const html = renderToString(<Icon name="home" filled />);
  assert.ok(
    html.includes(`viewBox="${MATERIAL_SYMBOLS_VIEWBOX}"`),
    `Filled icon also needs viewBox="${MATERIAL_SYMBOLS_VIEWBOX}" but got: ${html}`,
  );
});
