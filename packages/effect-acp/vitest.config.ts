import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "../../vitest.config.ts";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      // These tests spawn child processes and can exceed Vitest's default budget
      // when turbo runs multiple packages at once.
      fileParallelism: false,
      testTimeout: 20_000,
      hookTimeout: 20_000,
    },
  }),
);
