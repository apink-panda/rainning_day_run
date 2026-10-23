// scripts/patch-vinext.js
// Automatically ensures vinext supports basePath during static export prerender

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prerenderFile = path.resolve(__dirname, '../node_modules/vinext/dist/build/prerender.js');

if (fs.existsSync(prerenderFile)) {
  let content = fs.readFileSync(prerenderFile, 'utf-8');
  const target = 'const htmlRequest = new Request(`http://localhost${urlPath}`, { headers: htmlHeaders });';
  const replacement = `const bp = config.basePath ?? "";
				const reqPath = bp && !urlPath.startsWith(bp) ? \`\${bp}\${urlPath === '/' ? '' : urlPath}\` : urlPath;
				const htmlRequest = new Request(\`http://localhost\${reqPath || '/'}\`, { headers: htmlHeaders });`;

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(prerenderFile, content, 'utf-8');
    console.log('[patch-vinext] Successfully patched vinext prerender.js to support basePath.');
  } else if (content.includes('const bp = config.basePath ?? ""')) {
    console.log('[patch-vinext] vinext prerender.js is already patched.');
  }
}
