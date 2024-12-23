import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'WorkflowEngine',
      fileName: 'workflow-engine',
      formats: ['es', 'umd']
    },
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: [
          'console.log',
          'console.info',
          'console.debug',
          'console.warn',
          'console.error',
          'console.trace'
        ],
        passes: 2
      },
      mangle: true,
      format: {
        comments: false,
        max_line_len: 120
      }
    }
  },
  plugins: [
    dts({
      insertTypesEntry: true,
    })
  ],
  esbuild: {
    drop: ['console', 'debugger']
  }
}); 