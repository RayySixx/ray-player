// /api/search.js
export default async function handler(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ success: false, message: "Missing q" });

    const key = process.env.YOUTUBE_API_KEY;
    if (!key) {
      return res.status(500).json({
        success: false,
        message: "Missing YOUTUBE_API_KEY env"
      });
    }

    // 1) Search: ambil 1 videoId
    const searchUrl = "https://www.googleapis.com/youtube/v3/search?" + new URLSearchParams({
      key,
      part: "snippet",
      q,
      type: "video",
      maxResults: "1",
      safeSearch: "none"
    }).toString();

    const sRes = await fetch(searchUrl);
    const sJson = await sRes.json();

    if (!sRes.ok) {
      return res.status(500).json({ success: false, message: "YouTube search failed", error: sJson });
    }

    const item = sJson?.items?.[0];
    const videoId = item?.id?.videoId;
    if (!videoId) {
      return res.status(404).json({ success: false, message: "No results" });
    }

    // 2) Videos: ambil duration + title + thumb yang lebih rapi
    const vidUrl = "https://www.googleapis.com/youtube/v3/videos?" + new URLSearchParams({
      key,
      part: "snippet,contentDetails",
      id: videoId
    }).toString();

    const vRes = await fetch(vidUrl);
    const vJson = await vRes.json();

    if (!vRes.ok) {
      return res.status(500).json({ success: false, message: "YouTube videos failed", error: vJson });
    }

    const vItem = vJson?.items?.[0];
    const title = vItem?.snippet?.title || item?.snippet?.title || "Unknown";
    const thumbs = vItem?.snippet?.thumbnails || item?.snippet?.thumbnails || {};
    const thumbnail =
      thumbs?.maxres?.url ||
      thumbs?.high?.url ||
      thumbs?.medium?.url ||
      thumbs?.default?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const iso = vItem?.contentDetails?.duration || "PT0S";
    const durationSeconds = parseISODurationToSeconds(iso);

    return res.status(200).json({
      success: true,
      data: {
        videoId,
        title,
        thumbnail,
        duration: durationSeconds
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Server error", error: String(e?.message || e) });
  }
}

// PT#H#M#S -> detik
function parseISODurationToSeconds(iso) {
  // contoh: PT3M12S, PT1H2M5S
  const m = String(iso).match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const h = Number(m[1] || 0);
  const min = Number(m[2] || 0);
  const s = Number(m[3] || 0);
  return h * 3600 + min * 60 + s;
}
