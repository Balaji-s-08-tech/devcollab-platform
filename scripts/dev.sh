#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  ⚡ DevCollab Dev Startup"
echo "  ─────────────────────────────────────"
echo ""

for cmd in node npm; do
  if ! command -v $cmd &>/dev/null; then
    echo "❌  $cmd not found. Please install Node.js 18+"; exit 1
  fi
done

NODE_VER=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌  Node.js 18+ required (found $NODE_VER)"; exit 1
fi

echo "📦  Installing server dependencies..."
cd "$ROOT/server" && npm install --silent

echo "📦  Installing client dependencies..."
cd "$ROOT/client" && npm install --silent

CERT="$ROOT/server/certs/cert.pem"
KEY="$ROOT/server/certs/key.pem"
if [ ! -f "$CERT" ] || [ ! -f "$KEY" ]; then
  echo "🔒  SSL certs not found — generating..."
  bash "$ROOT/scripts/gen-certs.sh"
fi

if [ ! -f "$ROOT/server/.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/server/.env"
  echo "📝  Created server/.env from .env.example"
  echo "    ⚠️  Edit server/.env with your secrets before production!"
fi

echo ""
echo "🚀  Starting servers..."
echo "    API  → https://localhost:3443"
echo "    App  → https://localhost:5173"
echo "    Docs → https://localhost:5173/docs"
echo ""

cd "$ROOT"

trap 'kill $(jobs -p) 2>/dev/null; echo "\n👋  DevCollab stopped."; exit 0' INT TERM

(cd "$ROOT/server" && npm run dev) &
SERVER_PID=$!

sleep 2

(cd "$ROOT/client" && npm run dev) &
CLIENT_PID=$!

wait $SERVER_PID $CLIENT_PID
