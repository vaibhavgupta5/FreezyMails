import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/prisma.ts', 'src/lib/supabase*.ts', 'src/lib/mcp-*.ts', 'src/lib/queue.ts'],
    },
  },
})
