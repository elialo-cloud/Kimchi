const JSON_HEADERS = {
  'content-type': 'application/json; charset=UTF-8',
  'cache-control': 'no-store'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function getUserId(request) {
  return request.headers.get('cf-access-authenticated-user-email')?.trim().toLowerCase() || null;
}

function validState(state) {
  return state && typeof state === 'object' &&
    Array.isArray(state.batches) &&
    Array.isArray(state.inkopItems) &&
    Array.isArray(state.savedRecipes);
}

async function sync(request, env) {
  if (!env.DB) return json({ error: 'D1 binding DB saknas.' }, 500);

  const userId = getUserId(request);
  if (!userId) return json({ error: 'Cloudflare Access krävs.' }, 401);

  if (request.method === 'GET') {
    const row = await env.DB.prepare(
      'SELECT data_json, updated_at FROM app_state WHERE user_id = ?1'
    ).bind(userId).first();

    if (!row) return json({ state: null, updatedAt: null });

    try {
      return json({ state: JSON.parse(row.data_json), updatedAt: row.updated_at });
    } catch {
      return json({ error: 'Sparad data kunde inte läsas.' }, 500);
    }
  }

  if (request.method === 'PUT') {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Ogiltig JSON.' }, 400);
    }

    if (!validState(body.state)) return json({ error: 'Ogiltigt dataschema.' }, 400);

    const payload = JSON.stringify(body.state);
    if (payload.length > 500000) return json({ error: 'Datasatsen är för stor.' }, 413);

    const now = new Date().toISOString();
    await env.DB.prepare(`
      INSERT INTO app_state (user_id, data_json, updated_at)
      VALUES (?1, ?2, ?3)
      ON CONFLICT(user_id) DO UPDATE SET
        data_json = excluded.data_json,
        updated_at = excluded.updated_at
    `).bind(userId, payload, now).run();

    return json({ ok: true, updatedAt: now });
  }

  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  return json({ error: 'Method not allowed.' }, 405);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/sync') {
      return sync(request, env);
    }

    let response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) return response;

    const html = await response.text();
    if (html.includes('/cloud-sync.js')) return new Response(html, response);

    const injected = html.replace(
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
};
