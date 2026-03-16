import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      "@config": path.resolve(__dirname, "src/config/index.ts"),
      "@types": path.resolve(__dirname, "src/types/index.ts"),
      "@schemas": path.resolve(__dirname, "src/schemas/index.ts"),
      "@lib": path.resolve(__dirname, "src/lib/index.ts"),
      "@middleware": path.resolve(__dirname, "src/middleware/index.ts"),
      "@services": path.resolve(__dirname, "src/services/index.ts"),
      "@controllers": path.resolve(__dirname, "src/controllers/index.ts"),
      "@routes": path.resolve(__dirname, "src/routes/index.ts"),
    },
  },
});
