import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

process.env.WRANGLER_WRITE_LOGS ??= "false";
process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

export default defineConfig({
  server: isCodexSeatbeltSandbox
    ? { watch: { useFsEvents: false, usePolling: true } }
    : undefined,
  plugins: [
    // vinext registers @vitejs/plugin-rsc for App Router projects itself.
    vinext(),
    sites(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"]
      },
      config: {
        name: "mdr-drone-studio",
        main: "./worker/index.ts",
        compatibility_date: "2026-07-25",
        compatibility_flags: ["nodejs_compat"],
        d1_databases: [],
        r2_buckets: []
      }
    })
  ]
});
