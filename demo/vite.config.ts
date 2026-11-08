import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// The demo builds against the package source in this repo, so it always
// shows the current code. BASE is set by the Pages workflow.
export default defineConfig({
  base: process.env.BASE ?? "/",
  resolve: {
    alias: {
      granboard: fileURLToPath(new URL("../packages/granboard/src/index.ts", import.meta.url)),
    },
  },
});
