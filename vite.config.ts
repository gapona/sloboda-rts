import { defineConfig } from 'vite';
import { editorSavePlugin } from './vite-editor-plugin';

export default defineConfig({
  base: '/sloboda-rts/',
  server: { port: 5173, open: false },
  plugins: [editorSavePlugin()],
  build: {
    target: 'es2020',
    outDir: 'docs',
  },
});
