import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      // Proxy every /api/* request to the local Flask backend.
      // This eliminates CORS in dev because the browser only sees localhost:8080.
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        // Strip /api prefix if your Flask blueprints already include /api in url_prefix.
        // Set rewrite to (path) => path if your Flask routes start with /api (they do — keep as-is).
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
