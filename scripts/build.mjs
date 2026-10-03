import { build } from 'esbuild';
import { cp, rm } from 'node:fs/promises';
await rm('public/chunks', { recursive: true, force: true });
await build({
  entryPoints: { app: 'src/app.js' }, bundle: true, minify: true,
  format: 'esm', splitting: true, target: 'es2022', outdir: 'public',
  chunkNames: 'chunks/[name]-[hash]',
});
await cp('node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'public/pdf.worker.min.mjs');
for (const asset of ['cmaps', 'standard_fonts']) {
  await cp(`node_modules/pdfjs-dist/${asset}`, `public/pdf-assets/${asset}`, { recursive: true });
}
console.log('Built app and local PDF parser assets');
