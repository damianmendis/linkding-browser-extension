import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'fs';
import type { Plugin } from 'vite';

// After Vite writes output, fix up the directory structure so the manifest
// references work correctly. Also copies icon assets.
function webExtensionPlugin(isFirefox: boolean): Plugin {
  return {
    name: 'webextension-fixup',
    closeBundle() {
      const outDir = resolve(__dirname, isFirefox ? 'dist-firefox' : 'dist-chrome');

      // Move HTML files up from src/popup → popup and src/options → options
      const moves: [string, string][] = [
        [`${outDir}/src/popup/index.html`, `${outDir}/popup/index.html`],
        [`${outDir}/src/options/index.html`, `${outDir}/options/index.html`],
      ];
      for (const [from, to] of moves) {
        if (existsSync(from)) {
          mkdirSync(resolve(to, '..'), { recursive: true });
          // Copy then delete (avoids cross-device rename issues)
          copyFileSync(from, to);
        }
      }

      // Remove leftover src/ directory
      const srcDir = `${outDir}/src`;
      if (existsSync(srcDir)) {
        rmSync(srcDir, { recursive: true, force: true });
      }

      // Copy icon assets
      const assetSrc = resolve(__dirname, 'public/assets');
      const assetDest = `${outDir}/assets`;
      mkdirSync(assetDest, { recursive: true });
      for (const file of readdirSync(assetSrc)) {
        copyFileSync(resolve(assetSrc, file), resolve(assetDest, file));
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const isFirefox = mode === 'firefox';
  const outDir = isFirefox ? 'dist-firefox' : 'dist-chrome';

  return {
    plugins: [react(), webExtensionPlugin(isFirefox)],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup/index.html'),
          options: resolve(__dirname, 'src/options/index.html'),
          'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        },
        output: {
          entryFileNames: (chunk) => {
            if (chunk.name === 'background/service-worker') return 'background/service-worker.js';
            return '[name]/[name].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
    define: {
      __BROWSER__: JSON.stringify(isFirefox ? 'firefox' : 'chrome'),
    },
  };
});
