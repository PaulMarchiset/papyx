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
  // libraw-wasm finds its worker and its wasm next to itself through
  // import.meta.url, which pre-bundling would break by moving it.
  // utif2 is the opposite case: CommonJS, so it *must* be pre-bundled, and
  // listing it up front is what keeps that from happening mid-session.
  optimizeDeps: {
    exclude: ["pdfjs-dist", "libheif-js/libheif-wasm/libheif-bundle.mjs", "libraw-wasm"],
    include: ["utif2"],
  },
  // LibRaw's worker is an ES module (it reads import.meta.url to find its wasm).
  worker: { format: "es" },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
