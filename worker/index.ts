import handler from 'vinext/server/fetch-handler';
export { LoginGuard } from './login-guard';

const COOKIE = '__Secure-roomplaner-dev';
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
const privateHeaders = {
  ...securityHeaders,
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
};

function loginPage(base: string, status = 401) {
  const message =
    status === 429
      ? 'Too many attempts. Try again in 15 minutes.'
      : 'Enter the development password.';
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>RoomPlaner development</title><style>body{font:1rem system-ui;background:#101820;color:#fff;display:grid;place-items:center;min-height:95vh;margin:0}main{width:min(24rem,85vw)}input,button{box-sizing:border-box;width:100%;font:inherit;padding:.8rem;margin-top:.6rem;border-radius:.3rem}button{background:#99dcff;color:#101820;border:0;cursor:pointer}label{display:block;margin-top:1.5rem}</style><main><h1>RoomPlaner development</h1><p>${message}</p><form method="post" action="${base}/__login"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="256" required><button type="submit">Continue</button></form></main></html>`,
    {
      status,
      headers: {
        ...privateHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy':
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
        ...(status === 429 ? { 'Retry-After': '900' } : {}),
      },
    },
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const base = env.APP_BASE_PATH;
    if (url.pathname !== base && !url.pathname.startsWith(`${base}/`))
      return new Response('Not found', {
        status: 404,
        headers: securityHeaders,
      });
    const isDev = env.DEPLOYMENT === 'develop';
    if (isDev) {
      if (!env.DEV_PASSWORD || !env.LOGIN_GUARD)
        return new Response('Development access is not configured.', {
          status: 503,
          headers: privateHeaders,
        });
      const guard = env.LOGIN_GUARD.getByName('shared-development-password');
      if (url.pathname === `${base}/__login` && request.method === 'POST') {
        if (request.headers.get('Origin') !== url.origin)
          return new Response('Forbidden', {
            status: 403,
            headers: privateHeaders,
          });
        if (
          !request.headers
            .get('Content-Type')
            ?.startsWith('application/x-www-form-urlencoded')
        )
          return new Response('Unsupported media type', {
            status: 415,
            headers: privateHeaders,
          });
        // Stream with a hard bound; Content-Length alone is not trustworthy.
        const reader = request.body?.getReader();
        if (!reader) return loginPage(base);
        let body = '';
        let size = 0;
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 2048) {
            await reader.cancel();
            return new Response('Request too large', {
              status: 413,
              headers: privateHeaders,
            });
          }
          body += decoder.decode(value, { stream: true });
        }
        body += decoder.decode();
        const password = new URLSearchParams(body).get('password') ?? '';
        const result = await guard.login(
          request.headers.get('CF-Connecting-IP') ?? 'unknown',
          password,
          env.DEV_PASSWORD,
        );
        if (result.status !== 200) return loginPage(base, result.status);
        return new Response(null, {
          status: 303,
          headers: {
            ...privateHeaders,
            Location: base,
            'Set-Cookie': `${COOKIE}=${result.token}; Path=${base}; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`,
          },
        });
      }
      const token =
        request.headers
          .get('Cookie')
          ?.split(';')
          .map((value) => value.trim())
          .find((value) => value.startsWith(`${COOKIE}=`))
          ?.slice(COOKIE.length + 1) ?? '';
      if (!(await guard.valid(token, env.DEV_PASSWORD))) return loginPage(base);
    }
    // Authenticate before assets. Vinext prefixes compiled assets; public files
    // remain at the asset root and need the stripped-path fallback.
    let asset = await env.ASSETS.fetch(request);
    if (asset.status === 404) {
      const assetUrl = new URL(url);
      assetUrl.pathname = url.pathname.slice(base.length) || '/';
      asset = await env.ASSETS.fetch(new Request(assetUrl, request));
    }
    const response =
      asset.status !== 404 ? asset : await handler.fetch(request, env, ctx);
    const secured = new Response(response.body, response);
    for (const [name, value] of Object.entries(
      isDev ? privateHeaders : securityHeaders,
    ))
      secured.headers.set(name, value);
    if (!secured.headers.get('Content-Type')?.includes('text/html'))
      return secured;
    const nonce = crypto.randomUUID().replaceAll('-', '');
    secured.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}'`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "connect-src 'self'",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
    );
    // Nonces and their HTML must travel together; compiled assets remain cacheable.
    secured.headers.set('Cache-Control', 'private, no-store');
    secured.headers.delete('ETag');
    secured.headers.delete('Content-Length');
    return new HTMLRewriter()
      .on('script', {
        element(element) {
          element.setAttribute('nonce', nonce);
        },
      })
      .transform(secured);
  },
} satisfies ExportedHandler<Cloudflare.Env>;
