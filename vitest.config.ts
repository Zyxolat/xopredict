import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    // Exclude pre-existing Hardhat test files that use ethers.js syntax
    // incompatible with Vitest's module transform.
    exclude: ["test/**", "node_modules/**"],
  },
});
