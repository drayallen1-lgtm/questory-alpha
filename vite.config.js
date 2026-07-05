import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
    globals: false,
    setupFiles: ['./tests/unit/setup.js'],
    fileParallelism: false,
  },
});
