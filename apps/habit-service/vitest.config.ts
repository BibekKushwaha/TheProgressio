import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        extensions: ['.ts', '.js', '.mjs'],
        alias: {
            // Allow .js imports to resolve to .ts source
        },
    },
    cacheDir: '.vitest-cache',
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        setupFiles: [],
        testTimeout: 10000,
    },
});
