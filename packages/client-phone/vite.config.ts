import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    port: 5174,
    host: true, // accessible on LAN for phone testing
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2022",
  },
});
