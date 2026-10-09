export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Verify the gallery password securely on the server
    if (url.pathname === "/api/verify-gallery-password") {

      if (request.method !== "POST") {
        return new Response(
          JSON.stringify({ error: "Method not allowed" }),
          {
            status: 405,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store"
            }
          }
        );
      }

      try {
        const body = await request.json();

        const submittedPassword =
          typeof body.password === "string"
            ? body.password
            : "";

        const isCorrect =
          typeof env.GALLERY_SECRET === "string" &&
          submittedPassword === env.GALLERY_SECRET;

        return new Response(
          JSON.stringify({ success: isCorrect }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store"
            }
          }
        );

      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Invalid request" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store"
            }
          }
        );
      }
    }

    // Serve the wedding website normally
    return env.ASSETS.fetch(request);
  }
};
