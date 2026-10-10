# syntax=docker/dockerfile:1
ARG NODE_VERSION=22-slim
ARG NODE_DIGEST=sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392

FROM node:${NODE_VERSION}@${NODE_DIGEST} AS runtime

# yt-dlp needs python3 + ffmpeg to download and merge video/audio streams.
RUN --mount=type=cache,id=apt-cache,target=/var/cache/apt,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends python3 ffmpeg curl ca-certificates && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --link package.json package-lock.json ./
RUN --mount=type=cache,id=npm-cache,target=/root/.npm npm ci --omit=dev

COPY --link server ./server

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "server/index.js"]
