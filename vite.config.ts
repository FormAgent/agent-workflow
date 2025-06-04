import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AgentWorkflow',
      fileName: 'agent-workflow',
      formats: ['es', 'umd'],
    },
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      external: ['zod', 'ai', '@ai-sdk/openai', 'openai'],
      output: {
        globals: {
          zod: 'z',
          ai: 'ai',
          '@ai-sdk/openai': 'openai',
          openai: 'OpenAI',
        },
      },
      treeshake: {
        moduleSideEffects: false,
      },
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
          'console.trace',
        ],
        passes: 2,
      },
      mangle: true,
      format: {
        comments: false,
        max_line_len: 120,
      },
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      exclude: [
        'examples/**/*',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/**/__tests__/**/*',
      ],
    }),
  ],
  esbuild: {
    drop: ['console', 'debugger'],
  },
});
