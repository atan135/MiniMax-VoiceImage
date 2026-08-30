import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.js'],
    globals: false,
    setupFiles: ['./vitest.setup.js']
  }
})
