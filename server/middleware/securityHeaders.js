const buildConnectSources = () => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const sources = [
    "'self'",
    clientUrl,
    "http://localhost:5173",
    "https://localhost:5173",
    "http://localhost:4173",
    "https://localhost:4173",
    "ws://localhost:5173",
    "wss://localhost:5173",
    "ws://localhost:3443",
    "wss://localhost:3443",
  ];

  return [...new Set(sources)];
};

const cspDirectives = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  connectSrc: buildConnectSources(),
  fontSrc: ["'self'", "data:"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  imgSrc: ["'self'", "data:", "blob:", "https:"],
  objectSrc: ["'none'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
};

if (process.env.NODE_ENV === "production") {
  cspDirectives.upgradeInsecureRequests = [];
}

const helmetOptions = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: cspDirectives,
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "same-site" },
  frameguard: { action: "deny" },
  hsts: {
    maxAge: 15552000,
    includeSubDomains: true,
    preload: process.env.NODE_ENV === "production",
  },
  noSniff: true,
  referrerPolicy: { policy: "no-referrer" },
};

module.exports = helmetOptions;
