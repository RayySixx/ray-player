const yts = require("yt-search");

/**
 * GET /api/search?q=...
 * Return: [{ id, url, title, thumb, author, duration }]
 */
module.exports = async (req, res) => {
  const q = (req.query?.q ? String(req.query.q) : "").trim();
  if (!q) return res.status(400).json({ error: "Query required" });

  try {
    const r = await yts(q);

    const results = (r.videos || []).slice(0, 24).map(v => {
      const id = v.videoId;
      return {
        id,
        url: `https://www.youtube.com/watch?v=${id}`,
        title: v.title,
        thumb: v.thumbnail,
        author: v.author?.name || "YouTube",
        duration: v.timestamp || "",
      };
    });

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(results);
  } catch (e) {
    console.error("search error:", e);
    res.status(500).json({ error: "Search gagal" });
  }
};
