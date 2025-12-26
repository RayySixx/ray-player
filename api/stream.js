import ytdl from "@distube/ytdl-core";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "ID missing" });

  try {
    // id bisa videoId doang atau full URL
    const videoUrl = /^https?:\/\//.test(id) ? id : `https://www.youtube.com/watch?v=${id}`;

    const info = await ytdl.getInfo(videoUrl, {
      requestOptions: {
        headers: {
          // header ini membantu sebagian kasus
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
    });

    const format = ytdl.chooseFormat(info.formats, {
      quality: "highestaudio",
      filter: "audioonly",
    });

    if (!format || !format.url) {
      return res.status(404).json({ error: "No playable audio format found" });
    }

    const mimeType = (format.mimeType || "audio/mp4").split(";")[0];

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Accept-Ranges", "bytes");

    // HTML5 audio biasanya kirim Range header
    const range = req.headers.range;

    // ytdl-core bisa stream langsung; untuk Range kita minta ke source pakai `range` option
    // (kalau environment/package-mu tidak support range ini, tetap akan play tapi seek bisa kurang mulus)
    const stream = ytdl(videoUrl, {
      quality: "highestaudio",
      filter: "audioonly",
      format,
      highWaterMark: 1 << 25, // bantu biar gak putus-putus
      requestOptions: {
        headers: {
          ...(range ? { Range: range } : {}),
        },
      },
    });

    // Kalau ada Range, balikin 206 biar player happy
    if (range) res.statusCode = 206;

    stream.on("error", (e) => {
      // Jangan kirim JSON kalau sudah mulai stream
      if (!res.headersSent) res.status(500).end("Stream error");
      else res.end();
      console.error("ytdl stream error:", e);
    });

    req.on("close", () => {
      stream.destroy();
    });

    stream.pipe(res);
  } catch (err) {
    console.error("stream error:", err);
    res.status(500).json({ error: "YouTube blocked / gagal ambil audio. Coba lagu lain." });
  }
}
