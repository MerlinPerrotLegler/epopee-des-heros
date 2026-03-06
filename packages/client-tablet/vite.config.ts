import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    port: 5173,
    host: true, // accessible on LAN for tablet testing
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2022",
  },
});
