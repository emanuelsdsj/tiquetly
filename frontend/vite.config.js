import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind every interface, not just localhost: inside the devcontainer,
    // VS Code's automatic port forwarding does not reliably pick up a
    // server listening only on loopback (seen in practice, see RODAR_LOCAL.md).
    host: true,
  },
})
