#!/bin/bash

set -e

CERTS_DIR="$(dirname "$0")/../server/certs"
mkdir -p "$CERTS_DIR"

echo "🔒 Generating self-signed SSL certificate..."

openssl req -x509 \
  -newkey rsa:4096 \
  -keyout "$CERTS_DIR/key.pem" \
  -out    "$CERTS_DIR/cert.pem" \
  -days   365 \
  -nodes \
  -subj   "/C=US/ST=Dev/L=Localhost/O=DevCollab/OU=Dev/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "✅ Certs written to server/certs/"
echo "   key.pem  — private key"
echo "   cert.pem — certificate"
echo ""
echo "⚠️  Your browser will show a warning for self-signed certs."
echo "   In Chrome: type 'thisisunsafe' on the warning page."
echo "   In Firefox: click 'Advanced' → 'Accept the Risk'."
