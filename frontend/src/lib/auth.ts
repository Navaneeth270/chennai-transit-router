import * as jose from "jose";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production-k8s9m2n4p6q8r0";
const JWT_ALGORITHM = "HS256";
const ACCESS_TOKEN_EXPIRE_MINUTES = 30;
const REFRESH_TOKEN_EXPIRE_DAYS = 7;

const secret = new TextEncoder().encode(JWT_SECRET);

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return bcrypt.compareSync(plain, hashed);
}

export async function createAccessToken(data: Record<string, string>): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRE_MINUTES * 60;
  return new jose.SignJWT({ ...data, type: "access" })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setExpirationTime(exp)
    .sign(secret);
}

export async function createRefreshToken(data: Record<string, string>): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60;
  return new jose.SignJWT({ ...data, type: "refresh" })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setExpirationTime(exp)
    .sign(secret);
}

export async function decodeToken(token: string): Promise<jose.JWTPayload> {
  const { payload } = await jose.jwtVerify(token, secret, {
    algorithms: [JWT_ALGORITHM],
  });
  return payload;
}

export async function getCurrentUser(
  authHeader: string | null,
): Promise<{ id: string; email: string } | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const payload = await decodeToken(token);
    if (payload.type !== "access") return null;
    const userId = payload.sub as string | undefined;
    if (!userId) return null;
    return { id: userId, email: (payload.email as string) || "" };
  } catch {
    return null;
  }
}

export interface StoredUser {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

const usersDb = new Map<string, StoredUser>();

export function getUsersDb(): Map<string, StoredUser> {
  return usersDb;
}
