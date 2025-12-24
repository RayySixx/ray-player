// /api/search.js
export default async function handler(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const page = Number(req.query.page || 1) || 1;

    if (!q) {
      return res.status(400).json({ success: false, message: "Missing q" });
    }

    // Ambil dari list populer + fallback
    // (Kalau satu mati, lanjut ke berikutnya)
    const instances = [
      "https://yewtu.be",
      "https://invidious.fdn.fr",
      "https://inv.nadeko.net",
      "https://vid.puffyan.us"
    ];

    let lastError = null;

    for (const base of instances) {
      const url =
        `${base}/api/v1/search?` +
        new URLSearchParams({
          q,
          page: String(page),
          type: "video",
          sort_by: "relevance" // ✅ penting: sort_by, bukan sort
        }).toString();

      // timeout per-attempt (biar gak ikut abort semua)
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      try {
        const r = await fetch(url, {
          signal: controller.signal,
          headers: {
            "user-agent": "RayPlayer/1.0",
            "accept": "application/json"
          }
        });

        clearTimeout(timer);

        if (!r.ok) {
          const text = await r.text().catch(() => "");
          lastError = `HTTP ${r.status} from ${base} :: ${text.slice(0, 120)}`;
          continue;
        }

        const data = await r.json();

        const items = (Array.isArray(data) ? data : [])
          .filter((x) => x?.type === "video" && x?.videoId)
          .slice(0, 12)
          .map((x) => ({
            videoId: x.videoId,
            title: x.title || "Untitled",
            author: x.author || "",
            duration: Number(x.lengthSeconds || 0),
            thumbnail:
              (x.videoThumbnails || [])
                .slice()
                .sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url ||
              `https://i.ytimg.com/vi/${x.videoId}/hqdefault.jpg`
          }));

        return res.status(200).json({
          success: true,
          source: base,
          query: q,
          items
        });
      } catch (e) {
        clearTimeout(timer);
        lastError = `${base} failed: ${String(e?.message || e)}`;
        continue;
      }
    }

    return res.status(502).json({
      success: false,
      message: "All Invidious instances failed",
      error: lastError
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
