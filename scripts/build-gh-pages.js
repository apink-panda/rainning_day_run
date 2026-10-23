// scripts/build-gh-pages.js
// Builds the application for GitHub Pages with proper basePath, .nojekyll, and CNAME

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// 1. Load .env.prod if present
const envProdPath = path.join(rootDir, '.env.prod');
if (fs.existsSync(envProdPath)) {
  const envContent = fs.readFileSync(envProdPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      const val = vals.join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key.trim()] = val;
    }
  }
}

process.env.NODE_ENV = 'production';
process.env.NEXT_PUBLIC_BASE_PATH ??= '/rainning_day_run';

console.log('[build-gh-pages] Building with NEXT_PUBLIC_BASE_PATH =', process.env.NEXT_PUBLIC_BASE_PATH);

// 2. Ensure vinext patch is applied
execSync('node scripts/patch-vinext.js', { stdio: 'inherit', cwd: rootDir });

// 3. Run build
execSync('npx vinext build', { stdio: 'inherit', cwd: rootDir, env: process.env });

// 4. Prepare out_pages for GitHub Pages
const clientDir = path.join(rootDir, 'dist', 'client');
const outPagesDir = path.join(rootDir, 'out_pages');

if (fs.existsSync(outPagesDir)) {
  fs.rmSync(outPagesDir, { recursive: true, force: true });
}
fs.mkdirSync(outPagesDir, { recursive: true });

// Copy all client files to outPagesDir root
fs.cpSync(clientDir, outPagesDir, { recursive: true });

// Vinext writes framework assets inside the basePath directory when
// NEXT_PUBLIC_BASE_PATH is set. GitHub Project Pages already strips the
// repository prefix before resolving files in the published artifact, so the
// same assets must also exist at the artifact root (`out_pages/_next`).
const basePathName = String(process.env.NEXT_PUBLIC_BASE_PATH || '')
  .replace(/^\/+|\/+$/g, '');
const nestedNextDir = basePathName
  ? path.join(clientDir, basePathName, '_next')
  : path.join(clientDir, '_next');
const rootNextDir = path.join(outPagesDir, '_next');
if (!fs.existsSync(nestedNextDir)) {
  throw new Error(`[build-gh-pages] Missing Vinext assets: ${nestedNextDir}`);
}
fs.cpSync(nestedNextDir, rootNextDir, { recursive: true });

// Ensure files are also available under /rainning_day_run/ subfolder for robust asset resolution
const subDir = path.join(outPagesDir, 'rainning_day_run');
if (!fs.existsSync(subDir)) {
  fs.mkdirSync(subDir, { recursive: true });
}
for (const item of fs.readdirSync(clientDir)) {
  if (item !== 'rainning_day_run') {
    const src = path.join(clientDir, item);
    const dest = path.join(subDir, item);
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

// 5. Add .nojekyll (prevents Jekyll from ignoring _next directory)
fs.writeFileSync(path.join(outPagesDir, '.nojekyll'), '', 'utf-8');
fs.writeFileSync(path.join(subDir, '.nojekyll'), '', 'utf-8');

// 6. Add CNAME for custom domain apink-panda.com
fs.writeFileSync(path.join(outPagesDir, 'CNAME'), 'apink-panda.com\n', 'utf-8');

// 7. Ensure 404.html serves index.html for SPA fallback
const indexPath = path.join(outPagesDir, 'index.html');
if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, path.join(outPagesDir, '404.html'));
  fs.copyFileSync(indexPath, path.join(subDir, '404.html'));
}

// Fail the build instead of publishing an HTML shell whose JavaScript/CSS is
// missing. This catches future Vinext output-layout changes before deployment.
const indexHtml = fs.readFileSync(indexPath, 'utf-8');
const frameworkAssets = [...indexHtml.matchAll(/(?:src|href)="([^"]*\/_next\/[^"?]+)[^"]*"/g)]
  .map((match) => match[1]);
for (const assetUrl of frameworkAssets) {
  const artifactPath = assetUrl.replace(/^\/+/, '').replace(`${basePathName}/`, '');
  if (!fs.existsSync(path.join(outPagesDir, artifactPath))) {
    throw new Error(`[build-gh-pages] HTML references missing asset: ${assetUrl}`);
  }
}

console.log('[build-gh-pages] Successfully built GitHub Pages package in out_pages/ ready for deployment!');
