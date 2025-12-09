import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: This ensures assets are loaded correctly on GitHub Pages
  // regardless of the repository name (e.g., https://user.github.io/repo-name/).
  base: './', 
})