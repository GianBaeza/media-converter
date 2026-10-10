# media-converter

Web app para descargar videos de YouTube eligiendo la calidad (hasta 1080p). Próximamente: conversión de archivos a PDF y otros formatos.

## Stack

- Frontend: React + Vite
- Backend: Express + [yt-dlp](https://github.com/yt-dlp/yt-dlp)

## Requisitos

- Node.js
- `yt-dlp` instalado y disponible en el `PATH`
- `ffmpeg` instalado (lo usa yt-dlp para unir video y audio)

## Desarrollo

```bash
npm install
npm run dev:all   # levanta frontend (Vite) y backend (Express) juntos
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Scripts

- `npm run dev` — solo frontend
- `npm run server` — solo backend
- `npm run dev:all` — frontend + backend en paralelo
- `npm run build` — build de producción del frontend
