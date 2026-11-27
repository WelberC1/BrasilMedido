import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves the site from /<repo>/; override with BASE_PATH (e.g. "/" for a custom domain).
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? (process.env.BASE_PATH ?? '/BrasilMedido/') : '/',
  plugins: [react(), tailwindcss()],
}))
