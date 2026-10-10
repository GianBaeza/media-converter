import express from 'express';
import cors from 'cors';
import { spawn } from 'node:child_process';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const YOUTUBE_URL_RE = /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i;

function isValidYoutubeUrl(url) {
  return typeof url === 'string' && YOUTUBE_URL_RE.test(url);
}

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => (stdout += chunk));
    proc.stderr.on('data', (chunk) => (stderr += chunk));
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `yt-dlp exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

// List available video qualities (capped at 1080p) for a given URL
app.post('/api/formats', async (req, res) => {
  const { url } = req.body;
  if (!isValidYoutubeUrl(url)) {
    return res.status(400).json({ error: 'URL de YouTube inválida' });
  }

  try {
    const output = await runYtDlp(['-j', '--no-playlist', url]);
    const info = JSON.parse(output);

    const heightSeen = new Set();
    const formats = (info.formats || [])
      .filter((f) => f.vcodec && f.vcodec !== 'none' && f.height && f.height <= 1080)
      .filter((f) => {
        if (heightSeen.has(f.height)) return false;
        heightSeen.add(f.height);
        return true;
      })
      .sort((a, b) => b.height - a.height)
      .map((f) => ({
        height: f.height,
        label: `${f.height}p${f.fps && f.fps > 30 ? f.fps : ''}`,
        ext: f.ext,
      }));

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      formats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo obtener información del video' });
  }
});

// Download the video at the chosen quality
app.get('/api/download', (req, res) => {
  const { url, height } = req.query;
  if (!isValidYoutubeUrl(url)) {
    return res.status(400).json({ error: 'URL de YouTube inválida' });
  }

  const maxHeight = Math.min(parseInt(height, 10) || 1080, 1080);
  // Streaming to stdout forces an mpegts container, which only carries
  // H.264/AAC reliably — VP9/Opus (common in webm formats) gets silently
  // dropped. Prefer mp4-native streams so the remux actually keeps video+audio.
  const formatSelector = [
    `bestvideo[height<=${maxHeight}][ext=mp4]+bestaudio[ext=m4a]`,
    `best[height<=${maxHeight}][ext=mp4]`,
    `bestvideo[height<=${maxHeight}]+bestaudio`,
    `best[height<=${maxHeight}]`,
  ].join('/');

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="video-${maxHeight}p.mp4"`);

  const proc = spawn('yt-dlp', [
    '-f', formatSelector,
    '--merge-output-format', 'mp4',
    '--no-playlist',
    '-o', '-',
    url,
  ]);

  proc.stdout.pipe(res);

  proc.stderr.on('data', (chunk) => {
    console.error(chunk.toString());
  });

  proc.on('error', (err) => {
    console.error(err);
    if (!res.headersSent) res.status(500).end();
  });

  req.on('close', () => {
    proc.kill('SIGKILL');
  });
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
