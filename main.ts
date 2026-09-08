async function handleRequest(request: Request): Promise<Response> {

  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname === '/' || pathname === '/index.html') {
    return new Response('Proxy is Running! Details: https://github.com/tech-shrimp/deno-api-proxy', {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  // Fix: original tech-shrimp code did `targetUrl = https://${pathname}` and dropped the query string.
  // Agnes video polling uses query params (video_id, model_name), so we must preserve url.search.
  const targetUrl = `https://${pathname}${url.search}`;

  try {
    const headers = new Headers();
    const allowedHeaders = ['accept', 'content-type', 'authorization'];
    for (const [key, value] of request.headers.entries()) {
      if (allowedHeaders.includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Referrer-Policy', 'no-referrer');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Failed to fetch:', error);
    return new Response('Internal Server Error: ' + String(error), { status: 500 });
  }
};

Deno.serve(handleRequest);
