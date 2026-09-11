import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

// Pin a west-of-UTC zone so the dates.unit midnight-trap assertion always executes
// (set before workers spawn; a UTC runner would otherwise skip the exact bug under test).
process.env.TZ = process.env.TZ ?? "America/New_York";

const cliArgs = process.argv.slice(2);
const isUnitOnlyRun = cliArgs.some((arg, index) =>
  arg.includes(".unit.spec.ts") ||
  arg === "--project=unit" ||
  (arg === "--project" && cliArgs[index + 1] === "unit"),
);

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: isUnitOnlyRun
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        stdout: "ignore",
        timeout: 120 * 1000,
      },
  projects: [
    {
      name: "unit",
      testMatch: /\.unit\.spec\.ts$/,
    },
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
      testMatch: /(today|completions|manage|backdate|task|rest)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup db"],
    },
  ],
});
