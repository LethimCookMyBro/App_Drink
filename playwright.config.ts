import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3099",
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run build && npm start -- -p 3099",
    port: 3099,
    timeout: 180_000,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { viewport: { width: 1440, height: 900 }, browserName: "chromium" },
    },
    {
      name: "Mobile Chrome",
      use: { viewport: { width: 390, height: 844 }, browserName: "chromium" },
    },
  ],
  outputDir: "test-results",
});
