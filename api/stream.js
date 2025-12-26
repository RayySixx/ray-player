const ytdl = require('@distube/ytdl-core');

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "ID missing" });

  try {
    const info = await ytdl.getInfo(id, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      }
    });

    const format = ytdl.chooseFormat(info.formats, { 
      quality: 'highestaudio', 
      filter: 'audioonly' 
    });

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ url: format.url });
  } catch (err) {
    res.status(500).json({ error: "YouTube Blocked. Coba cari lagu lain." });
  }
}
