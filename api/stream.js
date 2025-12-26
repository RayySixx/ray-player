const ytdl = require('ytdl-core');

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "ID YouTube required" });

  try {
    const info = await ytdl.getInfo(id, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      }
    });

    // Pilih format audio terbaik yang tidak gampang terputus
    const format = ytdl.chooseFormat(info.formats, { 
      quality: 'highestaudio', 
      filter: 'audioonly' 
    });

    res.setHeader('Cache-Control', 'no-store'); // Jangan di-cache biar nggak basi linknya
    res.status(200).json({ url: format.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "YouTube memblokir akses server. Coba cari lagu lain." });
  }
}
