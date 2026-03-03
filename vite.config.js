import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Plugin: serves a JSON list of .xlsx files in public/sales_data/
function salesDataFiles() {
  return {
    name: 'sales-data-files',
    configureServer(server) {
      server.middlewares.use('/__files', (_req, res) => {
        const dir = path.join(process.cwd(), 'public', 'sales_data')
        try {
          const files = fs.readdirSync(dir).filter((f) => /\.xlsx?$/i.test(f))
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(files))
        } catch {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify([]))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), salesDataFiles()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
