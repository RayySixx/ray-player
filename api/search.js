// /api/search.js
export default async function handler(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const page = Number(req.query.page || 1) || 1;

    if (!q) {
      return res.status(400).json({ success: false, message: "Missing q" });
    }

    // Public Invidious instances (kadang ada yang down, jadi kita fallback)
    const instances = [
      "https://yewtu.be",
      "https://vid.puffyan.us",
      "https://invidious.fdn.fr",
      "https://inv.nadeko.net",
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let lastErr = null;
    for (const base of instances) {
      try {
        const url =
          `${base}/api/v1/search?` +
          new URLSearchParams({
            q,
            page: String(page),
            type: "video",
            sort: "relevance",
          }).toString();

        const r = await fetch(url, {
          signal: controller.signal,
          headers: { "user-agent": "RayPlayer/1.0" },
        });

        if (!r.ok) {
          lastErr = new Error(`HTTP ${r.status} from ${base}`);
          continue;
        }

        const data = await r.json();

        // Normalisasi hasil supaya gampang dipakai frontend
        const items = (Array.isArray(data) ? data : [])
          .filter((x) => x?.type === "video" && x?.videoId)
          .slice(0, 12)
          .map((x) => ({
            videoId: x.videoId,
            title: x.title || "Untitled",
            author: x.author || "",
            duration: Number(x.lengthSeconds || 0),
            // pilih thumbnail terbaik yang ada
            thumbnail:
              (x.videoThumbnails || [])
                .slice()
                .sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url ||
              `https://i.ytimg.com/vi/${x.videoId}/hqdefault.jpg`,
          }));

        clearTimeout(timeout);
        return res.status(200).json({
          success: true,
          source: base,
          query: q,
          items,
        });
      } catch (e) {
        lastErr = e;
        // coba instance berikutnya
      }
    }

    clearTimeout(timeout);
    return res.status(502).json({
      success: false,
      message: "All Invidious instances failed",
      error: String(lastErr?.message || lastErr || "unknown"),
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e) });
  }
}
