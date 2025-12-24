const ytdl = require('ytdl-core');

export default async function handler(req, res) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: "YouTube ID is required" });
    }

    try {
        const videoURL = `https://www.youtube.com/watch?v=${id}`;
        
        // Cek info video
        const info = await ytdl.getInfo(videoURL);
        const format = ytdl.chooseFormat(info.formats, { 
            filter: 'audioonly', 
            quality: 'highestaudio' 
        });

        // Header agar browser menganggap ini file audio stream
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Pipe stream dari YouTube langsung ke client
        ytdl(videoURL, {
            format: format
        }).pipe(res);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to stream audio" });
    }
}
