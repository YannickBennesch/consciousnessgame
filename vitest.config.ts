import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    globalSetup: ["tests/global-setup.ts"],
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5434/game_test",
      ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
      AUTH_SECRET: "test-secret",
      APP_URL: "http://localhost:3000",
      STRIPE_SECRET_KEY: "sk_test_dummy",
      STRIPE_WEBHOOK_SECRET: "whsec_test_dummy",
      BOOTSTRAP_ADMINS: "admin@example.test",
    },
  },
});
