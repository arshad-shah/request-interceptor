import { defineConfig, build as viteBuild } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { visualizer } from 'rollup-plugin-visualizer'
import { resolve } from 'path'
import type { Plugin } from 'vite'

const isProduction = process.env.NODE_ENV === 'production'

const pathAliases = {
  '@': resolve(__dirname, './src'),
  '@components': resolve(__dirname, './src/components'),
  '@lib': resolve(__dirname, './src/lib'),
  '@hooks': resolve(__dirname, './src/hooks'),
  '@stores': resolve(__dirname, './src/stores'),
  '@types': resolve(__dirname, './src/types'),
  '@styles': resolve(__dirname, './src/styles'),
  '@popup': resolve(__dirname, './src/popup'),
  '@sidepanel': resolve(__dirname, './src/sidepanel'),
  '@assets': resolve(__dirname, './src/assets'),
}

/**
 * Chrome content scripts and injected scripts cannot use ES module imports.
 * This plugin builds them as self-contained IIFE bundles via a separate
 * Vite build after the main build completes.
 */
function bundleContentScripts(): Plugin {
  return {
    name: 'bundle-content-scripts',
    apply: 'build',
    async closeBundle() {
      const entries = ['content', 'injected']
      for (const name of entries) {
        await viteBuild({
          configFile: false,
          resolve: { alias: pathAliases },
          define: {
            global: 'globalThis',
            __DEV__: process.env.NODE_ENV === 'development',
          },
          build: {
            outDir: 'dist',
            emptyOutDir: false,
            lib: {
              entry: resolve(__dirname, `src/${name}.ts`),
              name,
              formats: ['iife'],
              fileName: () => `${name}.js`,
            },
            rollupOptions: {
              output: {
                extend: true,
              },
            },
            target: 'esnext',
            minify: 'esbuild',
            sourcemap: process.env.NODE_ENV === 'development',
          },
          esbuild: isProduction
            ? { pure: ['console.log', 'console.info', 'console.debug'] }
            : undefined,
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: 'public/manifest.json',
          dest: '.'
        },
        {
          src: 'public/icons',
          dest: '.'
        }
      ]
    }),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    bundleContentScripts()
  ],
  base: './',
  resolve: {
    alias: pathAliases
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      treeshake: {
        moduleSideEffects: (id) => {
          if (id.includes('lucide-react')) return false;
          return true;
        },
      },
      input: {
        popup: resolve(__dirname, 'popup.html'),
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId?.includes('background')) return 'background.js'
          return '[name].js'
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'styles/[name].[ext]'
          }
          return 'assets/[name].[ext]'
        }
      }
    },
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: process.env.NODE_ENV === 'development',
    cssCodeSplit: true
  },
  esbuild: isProduction
    ? {
        pure: ['console.log', 'console.info', 'console.debug']
      }
    : undefined,
  define: {
    global: 'globalThis',
    __DEV__: process.env.NODE_ENV === 'development'
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand'
    ]
  },
  server: {
    port: 3000,
    open: false
  }
})
