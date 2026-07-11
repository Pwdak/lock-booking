import crypto from "node:crypto";
import dotenv from "dotenv";

dotenv.config();

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload) {
  const secret = process.env.APP_SECRET || "dev-secret-change-me";
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function safeEqual(first, second) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  if (firstBuffer.length !== secondBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(firstBuffer, secondBuffer);
}

export function createToken(username) {
  const ttlHours = Number(process.env.AUTH_TOKEN_TTL_HOURS || 12);
  const payload = base64Url(
    JSON.stringify({
      sub: "pro",
      username,
      exp: Math.floor(Date.now() / 1000) + ttlHours * 60 * 60,
    }),
  );

  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token) {
  const [payload, signature] = String(token || "").split(".");

  if (!payload || !signature || !safeEqual(signature, sign(payload))) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function requireAuth(request, response, next) {
  const header = request.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const session = verifyToken(token);

  if (!session) {
    response.status(401).json({ error: "Authentification requise" });
    return;
  }

  request.session = session;
  next();
}