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
    watch: {
      // The devcontainer's bind mount doesn't deliver inotify events
      // reliably (seen in practice, edits saved to disk were served stale
      // until the dev server was restarted by hand). Polling instead of
      // relying on filesystem events fixes that at the cost of a bit of
      // CPU.
      usePolling: true,
    },
  },
  test: {
    // Pure-logic unit tests only (lib/format.js, lib/apiErrors.js); the
    // e2e/ directory holds Playwright specs, a different test runner
    // with its own `test`/`expect`, excluded here so Vitest doesn't try
    // to collect and run them too.
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
