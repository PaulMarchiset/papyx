import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  // pdf.js ships its worker as a separate ESM chunk; keeping it out of the
  // optimizer avoids a duplicate (and mismatched) copy of the library.
  // pdfjs-dist: see above. libheif ships one self-contained ESM file with the
  // wasm inlined, and it is only ever reached through a dynamic import — letting
  // the optimizer discover it mid-session would force a reload for nothing.
  optimizeDeps: {
    exclude: ["pdfjs-dist", "libheif-js/libheif-wasm/libheif-bundle.mjs"],
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
