// Inject the cloud-sync client into the existing static HTML without changing the calculator file.
export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) return response;

  const html = await response.text();
  if (html.includes('/cloud-sync.js')) return new Response(html, response);

  const injected = html
    .replace(
      /Dagboken och inköpslistan sparas lokalt i din webbläsare\./g,
      'Dagboken, inköpslistan och sparade recept synkas till Cloudflare.'
    )
    .replace(
      /<\/body>/i,
      '<script src="/cloud-sync.js" defer></script></body>'
    );

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(injected, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
