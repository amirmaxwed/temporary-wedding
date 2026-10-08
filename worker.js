const PASSWORD_INTERVAL = 30 * 60 * 1000; // 30 minutes

async function createPassword(secret) {
  const timeSlot = Math.floor(Date.now() / PASSWORD_INTERVAL);

  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(String(timeSlot))
  );

  const bytes = new Uint8Array(signature);

  let number = 0;

  for (let i = 0; i < 4; i++) {
    number = (number * 256 + bytes[i]) % 1000000;
  }

  return String(number).padStart(6, "0");
}


export default {
  async fetch(request, env) {

    const url = new URL(request.url);


    // TEST
    if (url.pathname === "/api/test") {
      return new Response("Worker is working!", {
        status: 200
      });
    }


    // CURRENT GALLERY PASSWORD
    if (url.pathname === "/api/gallery-password") {

      const password = await createPassword(env.GALLERY_SECRET);

      return new Response(
        JSON.stringify({
          password: password,
          expiresIn: PASSWORD_INTERVAL - (Date.now() % PASSWORD_INTERVAL)
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
          }
        }
      );
    }


    // EVERYTHING ELSE
    return env.ASSETS.fetch(request);
  }
};
