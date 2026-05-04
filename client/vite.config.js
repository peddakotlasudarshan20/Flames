import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const moduleId = id.replace(/\\/g, "/");
          if (moduleId.includes("node_modules/react") || moduleId.includes("node_modules/react-dom")) return "react";
          if (moduleId.includes("node_modules/framer-motion")) return "motion";
          if (moduleId.includes("node_modules/html2canvas")) return "capture";
          if (moduleId.includes("node_modules/lucide-react")) return "icons";
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
