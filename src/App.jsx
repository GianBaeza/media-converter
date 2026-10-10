import { useState } from 'react'
import './App.css'

// On Vercel the frontend and backend are separate deployments, so the
// backend URL must be absolute.
const API_URL = 'https://media-converter-production-19c7.up.railway.app'

function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [video, setVideo] = useState(null)
  const [selectedHeight, setSelectedHeight] = useState(null)
  const [downloading, setDownloading] = useState(false)

  async function handleFetchInfo(e) {
    e.preventDefault()
    setError('')
    setVideo(null)
    setSelectedHeight(null)

    if (!url.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/formats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')

      setVideo(data)
      if (data.formats?.length) setSelectedHeight(data.formats[0].height)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleDownload() {
    if (!selectedHeight) return
    setDownloading(true)
    const params = new URLSearchParams({ url: url.trim(), height: selectedHeight })
    const link = document.createElement('a')
    link.href = `${API_URL}/api/download?${params.toString()}`
    link.click()
    setTimeout(() => setDownloading(false), 2000)
  }

  return (
    <div className="page">
      <header className="header">
        <h1>YouTube Downloader</h1>
        <p>Pegá el link del video y elegí la calidad (hasta 1080p)</p>
      </header>

      <form className="url-form" onSubmit={handleFetchInfo}>
        <input
          type="text"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {video && (
        <div className="result">
          <div className="video-info">
            {video.thumbnail && <img src={video.thumbnail} alt={video.title} />}
            <div>
              <h2>{video.title}</h2>
              {video.duration && (
                <p>
                  Duración: {Math.floor(video.duration / 60)}:
                  {String(video.duration % 60).padStart(2, '0')}
                </p>
              )}
            </div>
          </div>

          {video.formats?.length > 0 ? (
            <div className="quality-picker">
              <label htmlFor="quality">Calidad</label>
              <select
                id="quality"
                value={selectedHeight ?? ''}
                onChange={(e) => setSelectedHeight(Number(e.target.value))}
              >
                {video.formats.map((f) => (
                  <option key={f.height} value={f.height}>
                    {f.label}
                  </option>
                ))}
              </select>

              <button type="button" onClick={handleDownload} disabled={downloading}>
                {downloading ? 'Descargando...' : 'Descargar'}
              </button>
            </div>
          ) : (
            <p className="error">No se encontraron calidades disponibles</p>
          )}
        </div>
      )}
    </div>
  )
}

export default App
