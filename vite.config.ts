import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // La vue 3D (three.js) est chargée à la demande dans son propre fichier.
  build: { chunkSizeWarningLimit: 700 },
});
