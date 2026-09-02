import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const publicDir = resolve(root, "public");
const webSource = resolve(root, "src/web");

await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });

// Only the clean v22 source is published. Older HTML/CSS/JS remains outside
// public as an archive and can never be loaded together with the new runtime.
await cp(webSource, publicDir, { recursive: true });
