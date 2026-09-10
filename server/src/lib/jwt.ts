// backend/src/lib/jwt.ts
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "../config/env.js";

const enc = new TextEncoder();
const ACCESS_KEY = enc.encode(env.JWT_ACCESS_SECRET);
const REFRESH_KEY = enc.encode(env.JWT_REFRESH_SECRET);

const ISS = "cccms-api";
const AUD = "cccms-app";
const opts = { issuer: ISS, audience: AUD } as const;

export type Role = "super_admin" | "manager" | "client";

export interface AccessClaims extends JWTPayload {
  sub: string;
  role: Role;
  sid: string;
}

export const signAccessToken = (c: { sub: string; role: Role; sid: string }) =>
  new SignJWT(c).setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt().setIssuer(ISS).setAudience(AUD)
    .setExpirationTime(env.ACCESS_TOKEN_TTL).sign(ACCESS_KEY);

export const signRefreshToken = (sub: string, sid: string) =>
  new SignJWT({ sub, sid }).setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt().setIssuer(ISS).setAudience(AUD)
    .setExpirationTime(`${env.REFRESH_TOKEN_TTL_DAYS}d`).sign(REFRESH_KEY);

export const verifyAccessToken = async (t: string) =>
  (await jwtVerify<AccessClaims>(t, ACCESS_KEY, opts)).payload;

export const verifyRefreshToken = async (t: string) =>
  (await jwtVerify<{ sub: string; sid: string }>(t, REFRESH_KEY, opts)).payload;