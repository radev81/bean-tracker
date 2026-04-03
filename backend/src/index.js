import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import { handleAuthRoutes } from "@logto/express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import path from "path";
import { fileURLToPath } from "url";
import beansRouter from "./routes/beans.js";
import containersRouter from "./routes/containers.js";
import shopsRouter from "./routes/shops.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.LOGTO_ENDPOINT}/oidc/jwks`),
);

const logtoConfig = {
  appId: process.env.LOGTO_APP_ID,
  appSecret: process.env.LOGTO_APP_SECRET,
  endpoint: process.env.LOGTO_ENDPOINT,
  baseUrl: process.env.BASE_URL,
  scopes: ["openid", "profile", "email"],
  postCallbackRedirectUri: "/beans/",
};

if (process.env.NODE_ENV !== "production") {
  app.use(cors({ origin: "http://localhost:5173", credentials: true }));
}

app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 14 * 24 * 60 * 60 * 1000 },
  }),
);

app.use(handleAuthRoutes(logtoConfig));

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const token = authHeader.slice(7);
    await jwtVerify(token, JWKS, {
      issuer: `${process.env.LOGTO_ENDPOINT}/oidc`,
      audience: process.env.API_RESOURCE,
    });
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    res.status(401).json({ error: "Not authenticated" });
  }
}

// Health check — unprotected
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Redirect root to app
app.get("/", (req, res) => {
  res.redirect("/beans/");
});

// Protected API routes
app.use("/api/beans", requireAuth, beansRouter);
app.use("/api/containers", requireAuth, containersRouter);
app.use("/api/shops", requireAuth, shopsRouter);

// Serve the built React app
app.use(
  "/beans",
  express.static(path.join(__dirname, "../public"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".webmanifest")) {
        res.setHeader("Content-Type", "application/manifest+json");
      }
    },
  }),
);
app.get("/beans/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Bean Tracker API running on port ${PORT}`);
});
