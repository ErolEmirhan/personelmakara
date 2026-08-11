/** Yerel (çalışan) build kimliği — index.html meta */
export function readLocalBuildVersion() {
  return document.querySelector('meta[name="makara-build"]')?.getAttribute('content') || null;
}

/** Sunucudaki güncel build kimliği — SW önbelleğini atlar */
export async function fetchRemoteBuildVersion() {
  try {
    const base = import.meta.env.BASE_URL || '/';
    const url = new URL('index.html', `${window.location.origin}${base}`);
    url.searchParams.set('makara-build-check', String(Date.now()));
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/name=["']makara-build["']\s+content=["']([^"']+)["']/i);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

export function isRemoteBuildNewer(local, remote) {
  return !!(remote && local && remote !== local);
}

export async function compareBuildVersions() {
  const local = readLocalBuildVersion();
  const remote = await fetchRemoteBuildVersion();
  return {
    local,
    remote,
    updateAvailable: isRemoteBuildNewer(local, remote),
  };
}
