import ytdl from "ytdl-core";

export default async function handler(req, res) {
  try {
    const id = (req.query.id || "").toString().trim();
    if (!id) return res.status(400).json({ error: "Missing id" });

    const url = `https://www.youtube.com/watch?v=${id}`;
    if (!ytdl.validateURL(url)) return res.status(400).json({ error: "Invalid video id" });

    const info = await ytdl.getInfo(url);

    // pilih format mp4 (audio+video) biar PiP bisa jalan normal
    const format = ytdl.chooseFormat(info.formats, {
      quality: "highest",
      filter: (f) =>
        f.container === "mp4" &&
        f.hasAudio &&
        f.hasVideo &&
        !!f.contentLength,
    });

    if (!format || !format.contentLength) {
      return res.status(404).json({ error: "No suitable mp4 format found" });
    }

    const total = Number(format.contentLength);
    const range = req.headers.range;

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-store");

    if (range) {
      const match = /bytes=(\d+)-(\d+)?/.exec(range);
      if (!match) return res.status(416).end();

      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : Math.min(start + 1024 * 1024 * 2, total - 1); // chunk 2MB
      if (start >= total) return res.status(416).end();

      res.statusCode = 206;
      res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
      res.setHeader("Content-Length", String(end - start + 1));

      ytdl(url, {
        format,
        range: { start, end },
        highWaterMark: 1 << 25,
      }).pipe(res);
      return;
    }

    res.setHeader("Content-Length", String(total));
    ytdl(url, { format, highWaterMark: 1 << 25 }).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "video stream error" });
  }
}
