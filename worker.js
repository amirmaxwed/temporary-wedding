const TOKEN_LIFETIME = 60 * 60 * 1000; // 1 hour

function base64UrlEncode(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function signToken(expiry, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(String(expiry))
  );

  return base64UrlEncode(new Uint8Array(signature));
}

async function verifyToken(token, secret) {
  if (!token || !secret) return false;

  const parts = token.split(".");

  if (parts.length !== 2) return false;

  const expiry = Number(parts[0]);

  if (!Number.isSafeInteger(expiry) || expiry <= Date.now()) {
    return false;
  }

  const expectedSignature = await signToken(expiry, secret);

  return parts[1] === expectedSignature;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Verify the guest's gallery password
    if (url.pathname === "/api/verify-gallery-password") {
      if (request.method !== "POST") {
        return new Response("Method not allowed", {
          status: 405,
          headers: { "Cache-Control": "no-store" }
        });
      }

      try {
        const body = await request.json();

        if (
          typeof body.password !== "string" ||
          body.password !== env.GALLERY_SECRET
        ) {
          return Response.json(
            { success: false },
            { headers: { "Cache-Control": "no-store" } }
          );
        }

       if (!env.GALLERY_SECRET) {
  return new Response("Gallery secret is missing", {
    status: 500,
    headers: { "Cache-Control": "no-store" }
  });
}
        const expiry = Date.now() + TOKEN_LIFETIME;
       const signature = await signToken(
  expiry,
  env.GALLERY_SECRET
);
        return Response.json(
          {
            success: true,
            token: `${expiry}.${signature}`,
            expiresIn: TOKEN_LIFETIME
          },
          {
            headers: { "Cache-Control": "no-store" }
          }
        );

      } catch (error) {
        return new Response("Invalid request", {
          status: 400,
          headers: { "Cache-Control": "no-store" }
        });
      }
    }

    // Protect every file inside /private/
    if (url.pathname.startsWith("/private/")) {
      const token = url.searchParams.get("token");

     const valid = await verifyToken(
  token,
  env.GALLERY_SECRET
);

      if (!valid) {
        return new Response("Access denied", {
          status: 403,
          headers: { "Cache-Control": "no-store" }
        });
      }

      const response = await env.ASSETS.fetch(request);

      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "private, no-store");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    // Serve the rest of the wedding website normally
    return env.ASSETS.fetch(request);
  }
};
