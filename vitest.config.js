import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: "./src/test/setup.js",
    testTimeout: 20000,
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      all: true,
      include: ["src/**/*.js"],
      exclude: [
        "src/server.js",
        "src/test/**",
        "src/utils/seed.js",
        "src/**/*.test.js",
      ],
    },
  },
});
