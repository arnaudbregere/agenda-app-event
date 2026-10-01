import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, EVENTS_DATA_FILE, E2E_PORT } from "./tests/support/paths.js";

// Mode de lancement choisi : build frontend (`frontend/dist`) servi par le
// vrai serveur Express backend, exactement comme en prod (voir
// backend/src/app.ts, bloc FRONTEND_DIST) — pas de `vite preview` séparé,
// pas de CORS à gérer, un seul serveur à attendre.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  webServer: {
    command:
      `npm run build --prefix ../frontend && ` +
      `EVENTS_DATA_FILE="${EVENTS_DATA_FILE}" PORT=${E2E_PORT} npx tsx ../backend/server.ts`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    cwd: import.meta.dirname,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
