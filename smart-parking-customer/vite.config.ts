import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

function patchThree(): Plugin {
  return {
    name: "patch-three",
    enforce: "pre",
    transform(code, id) {
      if (id.includes("node_modules/three/") || id.includes("node_modules/.vite/deps/three")) {
        const patterns = [
          // Remove THREE.Clock deprecation warning (r183+)
          [/warn\s*\(\s*["'`]Clock:\s*This module has been deprecated[^"'`]*["'`]\s*\)\s*;?\s*/g, "/* three: removed Clock deprecation */"],
          [/console\.warn\s*\(\s*["'`]THREE\.Clock:[\s\S]*?deprecated[^"'`]*["'`]\s*\)\s*;?\s*/g, "/* three: removed Clock deprecation */"],
          // Remove THREE.WebGLRenderer: Context Lost log (Three.js already handles it internally)
          [/log\s*\(\s*["'`]WebGLRenderer:\s*Context\s+Lost\.?["'`]\s*\)\s*;?\s*/g, "/* three: removed Context Lost log */"],
          [/console\.log\s*\(\s*["'`]THREE\.WebGLRenderer:\s*Context\s+Lost\.?[^"'`]*["'`]\s*\)\s*;?\s*/g, "/* three: removed Context Lost log */"],
        ]
        let result = code
        for (const [pattern, replacement] of patterns) {
          result = result.replace(pattern, replacement)
        }
        if (result !== code) return result
      }
      return code
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), patchThree()],
  optimizeDeps: {
    exclude: ["three"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "https://smart-parking-backend-api.up.railway.app",
        changeOrigin: true,
      },
      "/uploads": {
        target: "https://smart-parking-backend-api.up.railway.app",
        changeOrigin: true,
      },
    },
  },
})
