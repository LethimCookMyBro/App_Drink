import { test, expect, type Page } from "@playwright/test";

test.describe("Home page", () => {
  test("renders with title and CTAs", async ({ page }: { page: Page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("วง");
    
    const createBtn = page.getByRole("link", { name: /สร้างวง/ });
    await expect(createBtn).toBeVisible();
    
    const joinBtn = page.getByRole("link", { name: /เข้าร่วมวง/ });
    await expect(joinBtn).toBeVisible();
  });

  test("no raw Material Symbol icon names displayed", async ({ page }: { page: Page }) => {
    await page.goto("/");
    const body = await page.textContent("body") ?? "";
    expect(body).not.toContain("casino");
    expect(body).not.toContain("psychology_alt");
    expect(body).not.toContain("how_to_vote");
  });

  test("SVG icons render", async ({ page }: { page: Page }) => {
    await page.goto("/");
    const svgCount = await page.locator("svg").count();
    expect(svgCount).toBeGreaterThan(0);
  });
});

test.describe("Join page", () => {
  test("has exactly one room code input and one player name input", async ({ page }: { page: Page }) => {
    await page.goto("/join");
    const inputs = page.locator('input[type="text"]');
    const count = await inputs.count();
    expect(count).toBe(2);
    // Room code input should have maxLength=8
    const roomCodeInput = page.locator('input[maxlength="8"]');
    await expect(roomCodeInput).toBeVisible();
  });
});

test.describe("Game modes", () => {
  test("renders mode cards with SVG icons", async ({ page }: { page: Page }) => {
    await page.goto("/game/modes");
    await page.waitForTimeout(1000);
    const svgCount = await page.locator("svg").count();
    expect(svgCount).toBeGreaterThan(0);
    const body = await page.textContent("body") ?? "";
    expect(body).not.toMatch(/\b(casino|psychology_alt|how_to_vote)\b/);
  });
});

test.describe("Summary empty state", () => {
  test("shows safe empty state when no summary data", async ({ page }: { page: Page }) => {
    await page.goto("/game/summary");
    await page.waitForTimeout(500);
    const body = await page.textContent("body") ?? "";
    expect(body).not.toContain("จบเกม!");
    expect(body).toContain("ยังไม่มีผลการเล่น");
  });
});

test.describe("Settings", () => {
  test("toggles have accessible names", async ({ page }: { page: Page }) => {
    await page.goto("/settings");
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < count; i++) {
      const label = await checkboxes.nth(i).getAttribute("aria-label");
      expect(label).toBeTruthy();
    }
  });
});

test.describe("No critical console errors", () => {
  test("home page has no pageerror", async ({ page }: { page: Page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err: Error) => errors.push(err.message));
    await page.goto("/");
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });
});
