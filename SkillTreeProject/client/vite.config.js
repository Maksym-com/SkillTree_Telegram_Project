import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174, // Фиксируем порт, чтобы он не прыгал
    allowedHosts: true // Это разрешит любые хосты (для локальной разработки и туннеля — самое то)
  }
})