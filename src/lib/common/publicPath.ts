// ═══════════════════════════════════════════════════════════
// publicPath · resolve absolute URLs to static assets that
// respect the Next.js `basePath` (set in next.config.ts when
// deploying to GitHub Pages: `/Morning-Awakening-github.com`).
//
// Use whenever you reference a file under /public/ from inside
// JSX or imperative code (`window.open`, `<img src>`, etc.),
// because Next does NOT rewrite plain `src="/foo"` attributes.
// ═══════════════════════════════════════════════════════════

const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH as string | undefined) ?? '';

/** Prefix `path` with the configured basePath. Idempotent: a
 *  path already starting with the basePath is returned as-is. */
export function withBasePath(path: string): string {
  if (!path.startsWith('/')) return path;
  if (BASE_PATH && path.startsWith(BASE_PATH + '/')) return path;
  return `${BASE_PATH}${path}`;
}
