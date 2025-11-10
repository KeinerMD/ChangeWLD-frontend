import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
        // Evita que Vite cierre conexiones antes de tiempo:
        configure: (proxy) => {
          proxy.on("error", (err, req, res) => {
            console.log("🔴 Proxy error:", err.message);
            if (!res.headersSent) {
              res.writeHead(500, { "Content-Type": "text/plain" });
            }
            res.end("Proxy connection error");
          });
          proxy.on("proxyReq", (_, req) => {
            console.log("➡️  Proxying request to:", req.url);
          });
          proxy.on("proxyRes", (proxyRes, req) => {
            console.log("✅ Response from backend:", proxyRes.statusCode, req.url);
          });
        },
        timeout: 10000, // 10s de espera antes de cancelar
      },
    },
  },
});
