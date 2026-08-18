import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: "setup db",
      testMatch: /setup\.ts/,
      teardown: "cleanup db",
    },
    {
      name: "cleanup db",
      testMatch: /cleanup\.ts/,
    },
    {
      name: "chromium auth",
      testMatch: /auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium data",
      testMatch: /today\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup db"],
    },
  ],
});
