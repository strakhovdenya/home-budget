import { defineConfig } from "vitest/config";
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)), 'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)) } },
  test: {
    server: { deps: { inline: ['next-auth'] } },
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["tests/integration/**"],
  },
});
