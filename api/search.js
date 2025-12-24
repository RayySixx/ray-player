// /api/search.js
export default async function handler(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ success: false, message: "Missing q" });

    // Piped API base URLs (fallback kalau satu down)
    // Docs: base URL contoh official: https://pipedapi.kavin.rocks 2
    const bases = [
      "https://pipedapi.kavin.rocks",
      "https://pipedapi.in.projectsegfau.lt",
      "https://pipedapi.adminforge.de"
    ];

    let lastErr = null;

    for (const base of bases) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      try {
        const url = `${base}/search?` + new URLSearchParams({
          q,
          filter: "videos" // biar fokus video
        }).toString();

        const r = await fetch(url, {
          signal: controller.signal,
          headers: { "accept": "application/json", "user-agent": "RayPlayer/1.0" }
        });

        clearTimeout(timer);

        if (!r.ok) {
          const t = await r.text().catch(() => "");
          lastErr = `HTTP ${r.status} from ${base} :: ${t.slice(0, 120)}`;
          continue;
        }

        const data = await r.json();

        // Piped search response biasanya punya "items"
        const itemsRaw = Array.isArray(data?.items) ? data.items : [];

        const items = itemsRaw
          .filter(x => (x?.type === "stream" || x?.type === "video") && (x?.url || x?.id))
          .slice(0, 12)
          .map(x => {
            // Piped kadang kasih url "/watch?v=xxxx"
            const vid =
              x.id ||
              (typeof x.url === "string" ? (new URL("https://x.test" + x.url).searchParams.get("v")) : null) ||
              "";

            return {
              videoId: vid,
              title: x.title || "Untitled",
              author: x.uploaderName || x.uploader || "",
              duration: Number(x.duration || 0),
              thumbnail:
                x.thumbnail ||
                `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`
            };
          })
          .filter(x => x.videoId);

        return res.status(200).json({
          success: true,
          source: base,
          query: q,
          items
        });

      } catch (e) {
        clearTimeout(timer);
        lastErr = `${base} failed: ${String(e?.message || e)}`;
        continue;
      }
    }

    return res.status(502).json({
      success: false,
      message: "All Piped instances failed",
      error: lastErr
    });

  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
