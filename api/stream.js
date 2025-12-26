const ytdl = require('@distube/ytdl-core');

// Vercel: disable body parsing for streaming
module.exports.config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

/**
 * GET /api/stream?id=VIDEO_ID
 * Streams audio bytes (NOT JSON).
 */
module.exports = async function handler(req, res) {
  const id = (req.query && req.query.id ? String(req.query.id) : '').trim();
  if (!id) return res.status(400).json({ error: 'ID missing' });

  const videoUrl = /^https?:\/\//.test(id) ? id : `https://www.youtube.com/watch?v=${id}`;

  try {
    // Fetch info first to select a stable audio-only format.
    const info = await ytdl.getInfo(videoUrl, {
      requestOptions: {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
    });

    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });

    if (!format || !format.url) {
      return res.status(404).json({ error: 'No playable audio format found' });
    }

    const mimeType = String(format.mimeType || 'audio/mp4').split(';')[0];
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Accept-Ranges', 'bytes');

    // NOTE: We *forward* Range to YouTube if present. Some players require 206.
    const range = req.headers.range;
    if (range) res.statusCode = 206;

    const stream = ytdl(videoUrl, {
      quality: 'highestaudio',
      filter: 'audioonly',
      format,
      highWaterMark: 1 << 25,
      requestOptions: {
        headers: {
          ...(range ? { Range: range } : {}),
        },
      },
    });

    req.on('close', () => stream.destroy());

    stream.on('error', (e) => {
      console.error('ytdl stream error:', e);
      if (!res.headersSent) res.status(500).end('Stream error');
      else res.end();
    });

    stream.pipe(res);
  } catch (err) {
    console.error('stream handler error:', err);
    res.status(500).json({ error: 'YouTube blocked / gagal stream. Coba lagu lain.' });
  }
};
