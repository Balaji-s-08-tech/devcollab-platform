
.PHONY: help install dev certs seed test lint docker docker-down clean

help:
	@echo ""
	@echo "  ⚡ DevCollab — Available Commands"
	@echo "  ─────────────────────────────────────────────"
	@echo "  make install     Install all dependencies"
	@echo "  make certs       Generate local HTTPS certs"
	@echo "  make dev         Start dev servers (server + client)"
	@echo "  make seed        Seed demo data into MongoDB"
	@echo "  make test        Run all tests"
	@echo "  make lint        Lint all code"
	@echo "  make docker      Start with Docker Compose"
	@echo "  make docker-down Stop Docker containers"
	@echo "  make clean       Remove node_modules + build artifacts"
	@echo ""

install:
	@echo "📦 Installing dependencies..."
	cd server && npm install
	cd client && npm install

certs:
	@echo "🔒 Generating HTTPS certs..."
	bash scripts/gen-certs.sh

env:
	@[ -f server/.env ] || cp .env.example server/.env && echo "📝 Created server/.env"

dev: certs env
	bash scripts/dev.sh

seed:
	@echo "🌱 Seeding demo data..."
	cd server && node scripts/seed.js

test:
	@echo "🧪 Running server tests..."
	cd server && npm test
	@echo "🧪 Running client tests..."
	cd client && npm test

lint:
	cd server && npm run lint || true
	cd client && npm run lint || true

docker: certs
	@echo "🐳 Starting with Docker Compose..."
	docker-compose up -d --build
	@echo "✅ Services running:"
	@echo "   API    → https://localhost:3443"
	@echo "   Client → https://localhost:4173"
	@echo "   Mongo  → mongodb://localhost:27017"
	@echo "   Redis  → redis://localhost:6379"

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

clean:
	rm -rf server/node_modules server/logs server/coverage
	rm -rf client/node_modules client/dist
	@echo "🧹 Cleaned up"
