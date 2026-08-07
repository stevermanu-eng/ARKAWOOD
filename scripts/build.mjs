import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const rootStaticExtensions = new Set(['.html', '.css', '.js', '.txt']);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const files = await readdir(root, { withFileTypes: true });
for (const entry of files) {
  if (!entry.isFile()) continue;
  const extension = entry.name.includes('.') ? `.${entry.name.split('.').pop()}` : '';
  if (!rootStaticExtensions.has(extension)) continue;
  if (entry.name === 'README.txt') continue;
  await cp(join(root, entry.name), join(dist, entry.name));
}

await cp(join(root, 'assets'), join(dist, 'assets'), { recursive: true });
console.log('Cloudflare Pages build listo en dist/.');
