// Explicit allowlist: research, generated source originals, QA and adapters stay out of hosting.
import { mkdir, copyFile, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const name of ['index.html', 'app.mjs', 'engine.mjs', 'measure.mjs']) await copyFile(name, `dist/${name}`);
await cp('assets', 'dist/assets', { recursive: true });
console.log('Static prototype built in dist/');
