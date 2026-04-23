import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "../../vitest.config.ts";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      // These integration tests spawn Bun-backed mock peers and become
      // load-sensitive when turbo runs the workspace test matrix in parallel.
      fileParallelism: false,
      testTimeout: 20_000,
      hookTimeout: 20_000,
    },
  }),
);
