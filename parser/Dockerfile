# ── Stage 1: Build the Rust HTTP+parser binary ─────────────────────────────────
FROM rust:1.85-slim AS builder
RUN apt-get update \
 && apt-get install -y --no-install-recommends libssl-dev pkg-config ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/parser
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY tests ./tests

RUN cargo build --release

# ── Stage 2: Minimal runtime ───────────────────────────────────────────────────
FROM gcr.io/distroless/cc
COPY --from=builder /usr/src/parser/target/release/parser /usr/local/bin/parser

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/parser"]
