export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Test Worker is working
    if (url.pathname === "/api/test") {
      return new Response("Worker is working!", {
        status: 200,
        headers: {
          "Content-Type": "text/plain"
        }
      });
    }

    // Everything else goes to your existing website
    return env.ASSETS.fetch(request);
  }
};
