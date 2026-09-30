import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured.");
  }

  return secret;
}

function createSignature(payload: string) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
}

export function createSession() {
  const payload = Buffer.from(
    JSON.stringify({
      authenticated: true,
      createdAt: Date.now(),
    })
  ).toString("base64url");

  const signature = createSignature(payload);

  return `${payload}.${signature}`;
}

export function verifySession(value: string | undefined) {
  if (!value) {
    return false;
  }

  const parts = value.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const [payload, signature] = parts;

  const expectedSignature = createSignature(payload);

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  const valid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!valid) {
    return false;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    return decoded.authenticated === true;
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;

  return verifySession(session);
}

export { COOKIE_NAME };
