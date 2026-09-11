import { tanstackStartVite } from '@tanstack/start/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tanstackStartVite(),
  ],
  // Additional Vite configuration can be added here
});