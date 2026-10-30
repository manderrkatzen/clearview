// Pages serves the same public assets and proxies AI to the configured Worker.
// Provider credentials and validation stay in the existing backend.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      const upstream = new URL("https://clearview-data-quality-copilot.ritwikranjanpandey.workers.dev");
      upstream.pathname = url.pathname;
      upstream.search = url.search;
      const forwarded = new Request(upstream, request);
      forwarded.headers.delete("host");
      return fetch(forwarded, { redirect: "manual" });
    }
    return env.ASSETS.fetch(request);
  },
};
