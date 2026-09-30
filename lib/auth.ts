import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "ia_admin_session";

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error("ADMIN_SESSION_SECRET is missing");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret())
    .update(payload)
    .digest("base64url");
}

export function createSession(email: string) {
  const expires = Date.now() + 1000 * 60 * 60 * 24;
  const payload = `${email}|${expires}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function verifySession(token: string | undefined) {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const expected = sign(payload);

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const separator = payload.lastIndexOf("|");
    const email = payload.slice(0, separator);
    const expires = Number(payload.slice(separator + 1));

    if (!email || !expires || Date.now() > expires) return null;

    return { email, expires };
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const store = await cookies();
  return verifySession(store.get(COOKIE_NAME)?.value);
}

export { COOKIE_NAME };
