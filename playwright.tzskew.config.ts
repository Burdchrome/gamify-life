import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

// Same west-of-UTC runner pin as the base config — the SERVER is what gets
// skewed (via tz-skew.cjs), the runner and browser stay on device time.
process.env.TZ = process.env.TZ ?? "America/New_York";

// Issue #8 regression guard: boots the dev server on a clock that is on a
// DIFFERENT calendar day than the browser, then runs the completions persist
// spec. Own port + reuseExistingServer:false so it can never silently reuse a
// normal-clock server and false-pass.
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  webServer: {
    // NODE_OPTIONS (not a plain --require on the CLI): next dev renders in a
    // CHILD worker, and only NODE_OPTIONS re-runs the require in every child.
    // A TZ env var alone won't do — Windows Node ignores TZ set at spawn time;
    // tz-skew.cjs assigns process.env.TZ in-process, which works everywhere.
    command: "node node_modules/next/dist/bin/next dev -p 3100",
    env: { NODE_OPTIONS: "--require ./e2e/tz-skew.cjs" },
    url: "http://localhost:3100",
    reuseExistingServer: false,
    stdout: "pipe",
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
      name: "chromium data skewed",
      testMatch: /(completions|backdate)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup db"],
    },
  ],
});
