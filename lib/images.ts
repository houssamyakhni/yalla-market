/** Restrict product photos to the configured HTTPS ImageKit account namespace. */
export function isStoreImage(value: string, endpoint = process.env.IMAGEKIT_URL_ENDPOINT): boolean {
  if (!endpoint) return false;
  try {
    const image = new URL(value);
    const configured = new URL(endpoint);
    const prefix = configured.pathname.replace(/\/+$/, '') + '/';
    return configured.protocol === 'https:' && configured.hostname === 'ik.imagekit.io'
      && prefix !== '/' && !configured.username && !configured.password
      && image.protocol === 'https:' && image.origin === configured.origin
      && !image.username && !image.password && image.pathname.startsWith(prefix);
  } catch {
    return false;
  }
}
