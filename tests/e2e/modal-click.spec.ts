import { test, expect, type Page } from "@playwright/test";

test.describe("Deck Builder Create modal — click propagation", () => {
  test("input clicks keep modal open; backdrop click closes; keyboard works", async ({ page }: { page: Page }) => {
    await page.goto("/decks");
    await page.waitForTimeout(1000);

    const addButton = page.locator('button:has(svg)').first();
    await addButton.click();
    await page.waitForTimeout(500);

    const dialog = page.locator('[role="dialog"][aria-label="สร้างชุดคำถามใหม่"]');
    await expect(dialog).toBeVisible();

    // 1. Click name input — modal stays open
    const nameInput = dialog.locator('input').first();
    await nameInput.click();
    await page.waitForTimeout(300);
    await expect(dialog).toBeVisible();

    // 2. Type text — value persists
    await nameInput.fill("ทดสอบ");
    expect(await nameInput.inputValue()).toBe("ทดสอบ");

    // 3. Click description input — modal stays open
    const descInput = dialog.locator('input').nth(1);
    await descInput.click();
    await page.waitForTimeout(300);
    await expect(dialog).toBeVisible();

    // 4. Tab stays inside dialog
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(50);
      const inside = await page.evaluate(() => {
        const el = document.activeElement;
        return !!el?.closest('[role="dialog"]');
      });
      expect(inside).toBe(true);
    }

    // 5. Shift+Tab stays inside
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Shift+Tab");
      await page.waitForTimeout(50);
      const inside = await page.evaluate(() => {
        const el = document.activeElement;
        return !!el?.closest('[role="dialog"]');
      });
      expect(inside).toBe(true);
    }

    // 6. Escape closes
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await expect(dialog).not.toBeVisible();

    // 7. Focus returns to opener
    await expect(addButton).toBeFocused();

    // 8. Reopen, then backdrop click closes
    await addButton.click();
    await page.waitForTimeout(500);
    await expect(dialog).toBeVisible();
    await page.mouse.click(10, 10);
    await page.waitForTimeout(500);
    await expect(dialog).not.toBeVisible();
  });
});
