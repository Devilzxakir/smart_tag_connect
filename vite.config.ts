import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    // Nitro compiles the SSR/server-function output for the deploy target
    // (Vercel, Node, ...). Vercel requires this plugin: without it the build
    // deploys as static assets only and every route returns 404.
    nitro(),
    viteReact(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  build: {
    // The main client entry (React + router + Supabase) is inherently
    // ~520 kB minified (~150 kB gzip); route chunks stay small. Keep the
    // warning threshold just above it instead of flagging every build.
    chunkSizeWarningLimit: 650,
  },
});
