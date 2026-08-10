# syntax=docker/dockerfile:1

# ---- build stage -----------------------------------------------------------
# Pure-Go SQLite (modernc.org/sqlite) means CGO is not needed, so we produce a
# fully static binary that runs on a tiny base image.
FROM golang:1.24-alpine AS build

WORKDIR /src

# Download modules first so this layer is cached until go.mod/go.sum change.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server .

# ---- runtime stage ---------------------------------------------------------
FROM alpine:3.20

# ca-certificates: needed for outbound HTTPS to the Anthropic API.
# wget: used by the container HEALTHCHECK below.
RUN apk add --no-cache ca-certificates wget \
    && adduser -D -u 10001 app \
    && mkdir -p /data && chown app:app /data

WORKDIR /app
COPY --from=build /out/server /app/server

USER app

# DB_PATH points at the mounted volume so data survives redeploys.
ENV PORT=8080 \
    DB_PATH=/data/portfolio.db

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/app/server"]
