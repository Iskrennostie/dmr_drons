import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const publicDir = resolve(root, "public");
const allowedExtensions = new Set([".html", ".css", ".js"]);

await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const extension = entry.name.slice(entry.name.lastIndexOf("."));
  if (!allowedExtensions.has(extension)) continue;
  await cp(resolve(root, entry.name), resolve(publicDir, entry.name));
}

await cp(resolve(root, "assets"), resolve(publicDir, "assets"), { recursive: true });
