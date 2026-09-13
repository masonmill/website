import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // "server-only" only knows how to no-op under Next's webpack build (via
    // its react-server export condition). Under plain Node (vitest) it
    // throws unconditionally, so alias it to a stub for tests, mirroring
    // what Next's bundler does for genuine server-only imports.
    alias: {
      "server-only": new URL("./test/server-only-stub.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/.claude/**"],
  },
});
