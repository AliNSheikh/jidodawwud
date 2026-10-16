/**
 * Accept either a Google Maps embed URL or Google's entire iframe snippet.
 * The returned URL is validated before it is inserted into an iframe.
 */
export function googleMapsEmbedUrl(input: unknown): string {
  if (typeof input !== 'string') return '';
  let raw = input.trim();
  const iframe = raw.match(/<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i);
  if (iframe) raw = iframe[2].trim();
  raw = raw.replace(/&amp;/gi, '&');
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' ||
        !['www.google.com', 'google.com'].includes(url.hostname) ||
        url.pathname !== '/maps/embed') return '';
    return url.href;
  } catch {
    return '';
  }
}
