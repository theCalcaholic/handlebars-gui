import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
// import monacoEditorPlugin from 'vite-plugin-monaco-editor';
const prefix = "monaco-editor/esm/vs";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue()
    // monacoEditorPlugin({})
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  build: {
    // rollupOptions: {
    // output: {
    //   manualChunks: {
    //     jsonWorker: [`${prefix}/language/json/json.worker`],
    //     cssWorker: [`${prefix}/language/css/css.worker`],
    //     htmlWorker: [`${prefix}/language/html/html.worker`],
    //     tsWorker: [`${prefix}/language/typescript/ts.worker`],
    //     editorWorker: [`${prefix}/editor/editor.worker`],
    //   },
    // },
    // },
  },
  // optimizeDeps: {
  //   include: [
  //     `${prefix}/language/json/json.worker`,
  //     `${prefix}/language/css/css.worker`,
  //     `${prefix}/language/html/html.worker`,
  //     `${prefix}/language/typescript/ts.worker`,
  //     `${prefix}/editor/editor.worker`
  //   ]
  // }
});
