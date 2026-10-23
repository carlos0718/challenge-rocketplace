import { defineConfig } from "vitest/config";
import path from "node:path";

// Los tests de integración contra Supabase leen las claves de .env.local (si existe).
try {
  process.loadEnvFile(path.resolve(import.meta.dirname, ".env.local"));
} catch {}

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: { environment: "node", include: ["tests/**/*.test.ts"], testTimeout: 60000 },
});
