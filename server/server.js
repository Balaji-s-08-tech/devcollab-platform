require("dotenv").config();
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const compression = require("compression");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const {connectRedis }= require("./config/redis");
const configurePassport = require("./config/passport");
const { initSearchIndex } = require("./config/meilisearch");
const logger = require("./config/logger");
const { initSocketHandlers } = require("./socket/handlers");
const helmetOptions = require("./middleware/securityHeaders");
const { csrfProtection } = require("./middleware/csrf");
const { auditSensitiveRoutes } = require("./middleware/audit");
const { botDetection } = require("./middleware/abuseProtection");
const { publicLimiter } = require("./middleware/rateLimiter");

const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const documentRoutes = require("./routes/documents");
const taskRoutes = require("./routes/tasks");
const issueRoutes = require("./routes/issues");
const teamRoutes = require("./routes/teams");
const searchRoutes = require("./routes/search");
const notificationRoutes = require("./routes/notifications");
const userRoutes = require("./routes/users");

const gitRoutes = require("./routes/git");
const chatRoutes = require("./routes/chat");
const videoRoutes = require("./routes/video");
const githubRoutes = require("./routes/github");
const webhookRoutes = require("./routes/webhooks");
const permissionRoutes = require("./routes/permissions");
const shareRoutes = require("./routes/share");
const aiRoutes = require("./routes/ai");

const app = express();
const API = "/api";
const clientOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "https://localhost:4173",
  "http://localhost:4173",
  "https://localhost:5173",
  "http://localhost:5173",
];

app.set("trust proxy", 1);

app.use(helmet(helmetOptions));
app.use(botDetection);

app.use(cors({
  origin: clientOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-CSRF-Token",
    "X-XSRF-Token",
    "X-DevCollab-Signature",
  ],
}));

app.use(express.json({
  limit: "10mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
configurePassport();
app.use(passport.initialize());

app.use(mongoSanitize());

app.use(compression());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined", {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

app.use(API, publicLimiter, auditSensitiveRoutes, csrfProtection);
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/projects`, projectRoutes);
app.use(`${API}/documents`, documentRoutes);
app.use(`${API}/tasks`, taskRoutes);
app.use(`${API}/issues`, issueRoutes);
app.use(`${API}/teams`, teamRoutes);
app.use(`${API}/search`, searchRoutes);
app.use(`${API}/notifications`, notificationRoutes);

app.use(`${API}/git`, gitRoutes);
app.use(`${API}/chat`, chatRoutes);
app.use(`${API}/video`, videoRoutes);
app.use(`${API}/github`, githubRoutes);
app.use(`${API}/webhooks`, webhookRoutes);
app.use(`${API}/permissions`, permissionRoutes);
app.use(`${API}/share`, shareRoutes);
app.use(`${API}/ai`, aiRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    uptime: process.uptime(),
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} — ${err.message} — ${req.originalUrl}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 3443;

async function startServer() {

  await connectDB();
  await connectRedis();
  await initSearchIndex();

  let server;
  const keyPath = path.resolve(process.env.SSL_KEY_PATH || "./certs/key.pem");
  const certPath = path.resolve(process.env.SSL_CERT_PATH || "./certs/cert.pem");
  const httpsEnabled = process.env.ENABLE_HTTPS !== "false";

  if (httpsEnabled && fs.existsSync(keyPath) && fs.existsSync(certPath)) {

    const sslOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    server = https.createServer(sslOptions, app);
    logger.info("🔒 HTTPS server mode");
  } else {

    server = http.createServer(app);
    logger.warn("⚠️  No SSL certs found — falling back to HTTP. Run: cd server/certs && openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj '/CN=localhost'");
  }

  const io = new Server(server, {
    cors: {
      origin: clientOrigins,
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  app.set("io", io);

  initSocketHandlers(io);

  server.listen(PORT, () => {
    const protocol = fs.existsSync(keyPath) ? "https" : "http";
    logger.info(`🚀 DevCollab API running on ${protocol}://localhost:${PORT}`);
    logger.info(`🔌 Socket.io ready`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((err) => {
  logger.error("Failed to start server:", err);
  process.exit(1);
});

module.exports = app;
