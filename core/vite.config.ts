import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "index.ts",
      formats: ["es"],
    },
    rollupOptions: {
      output: {
        dir: "dist",
        format: "es",
        exports: "auto",
      },
    },
  },
});
