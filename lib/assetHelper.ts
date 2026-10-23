// lib/assetHelper.ts
// Handles asset path resolution with basePath for GitHub Pages and custom domain deployments

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function getAssetPath(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${cleanPath}`;
}
