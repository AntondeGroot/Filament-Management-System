import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    // Not "jsdom": the tests build their own JSDOM per case, because the thing
    // under test is a whole HTML document that has to be booted, not a module
    // that can be imported.
    environment: "node",
  },
});