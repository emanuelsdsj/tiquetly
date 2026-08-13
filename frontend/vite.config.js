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
  test: {
    // Pure-logic unit tests only (lib/format.js, lib/apiErrors.js); the
    // e2e/ directory holds Playwright specs, a different test runner
    // with its own `test`/`expect`, excluded here so Vitest doesn't try
    // to collect and run them too.
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
