import { defineConfig } from 'vitest/config';


export default defineConfig({


  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/app/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/app/**/*.spec.ts',
        'src/app/models/**/*.ts',
      ],
    },
  },
});