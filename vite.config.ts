import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  /** Относительные пути: иначе в Electron (file://) не грузятся /assets/… */
  base: "./",
  plugins: [react()],
  server: {
    host: true,
    /** false: if 5173 is busy, use next port (easier one-click start) */
    strictPort: false,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2020",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          const norm = id.replace(/\\/g, "/");
          if (norm.includes("react-dom")) return "react-dom";
          if (norm.includes("react-router")) return "react-router";
          if (norm.includes("node_modules/react/")) return "react";
        },
      },
    },
  },
});
