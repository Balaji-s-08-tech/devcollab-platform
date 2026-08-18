import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

const keyPath = path.resolve("../server/certs/key.pem");
const certPath = path.resolve("../server/certs/cert.pem");
const hasCerts = fs.existsSync(keyPath) && fs.existsSync(certPath);

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },

  server: {
    port: 5173,
    host: true,

    ...(hasCerts && {
      https: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      },
    }),
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3443",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: process.env.VITE_SOCKET_URL || "http://localhost:3443",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },

  preview: {
    port: 4173,
    host: true,
    ...(hasCerts && {
      https: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      },
    }),
  },

  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          editor: ["@tiptap/react", "@tiptap/starter-kit", "@tiptap/core"],
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable"],
          socket: ["socket.io-client"],
        },
      },
    },
  },

  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },

  test: {
    exclude: ["node_modules/**", "dist/**", "e2e/**"],
  },
});
