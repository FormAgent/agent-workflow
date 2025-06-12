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
    minify: false,
    rollupOptions: {
      external: [
        'zod',
        'ai',
        '@ai-sdk/openai',
        'openai',
        'node:path',
        'node:fs',
        'node:url',
        'node:stream',
        'node:buffer',
        'node:util',
        'node:events',
      ],
      output: {
        globals: {
          zod: 'z',
          ai: 'ai',
          '@ai-sdk/openai': 'openai',
          openai: 'OpenAI',
        },
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
});
