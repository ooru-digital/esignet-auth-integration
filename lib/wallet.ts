// Compare parsed URLs: a raw string prefix without a trailing slash would also match lookalike hosts and sibling paths
export function parseAllowedResponseUri(uri: string, prefix: string): URL | null {
  let target: URL
  let allowed: URL
  try {
    target = new URL(uri)
    allowed = new URL(prefix)
  } catch {
    return null
  }
  if (target.origin !== allowed.origin || target.username || target.password) return null
  const basePath = allowed.pathname.endsWith("/") ? allowed.pathname : `${allowed.pathname}/`
  return target.pathname.startsWith(basePath) ? target : null
}
