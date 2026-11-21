// Release files download with ordinary same-origin links, including in browsers without JavaScript.
export function releaseHeaders(url, size) {
  const match = /^\/downloads\/([A-Za-z0-9_-]+\.(zip|gif))$/.exec(url.pathname);
  if (!match) return {};
  const [, filename, extension] = match;
  const showImage = extension === 'gif' && url.searchParams.get('preview') === '1';
  const downloadName = filename === 'Hydrogen_Spectrum_V9_8_Full_Code.zip' ? 'Hydrogen-v98.zip' : filename;
  return {
    'Content-Type': extension === 'zip' ? 'application/zip' : 'image/gif',
    'Content-Disposition': (showImage ? 'inline' : 'attachment') + '; filename="' + downloadName + '"',
    'Content-Length': String(size),
    'Cache-Control': 'private, max-age=3600, no-transform',
    'X-Content-Type-Options': 'nosniff'
  };
}
