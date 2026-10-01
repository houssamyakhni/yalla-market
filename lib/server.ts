import 'server-only';
import { MongoClient, type Db } from 'mongodb';
import { randomBytes, createHmac, timingSafeEqual, scryptSync } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { cache } from 'react';
import type { Product } from './types';

const globals = globalThis as unknown as { mongo?: Promise<MongoClient>; indexes?: Promise<void> };
export async function database(): Promise<Db> {
  if (!process.env.MONGODB_URI) throw new Error('Database is not configured.');
  if (!globals.mongo) globals.mongo = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000, maxPoolSize: 10,
  }).connect().catch(error => { globals.mongo = undefined; throw error; });
  const db = (await globals.mongo).db(process.env.MONGODB_DB || 'yalla_market');
  if (!globals.indexes) globals.indexes = Promise.all([
    db.collection('products').createIndex({id:1},{unique:true}),
    db.collection('products').createIndex({slug:1},{unique:true}),
    db.collection('orders').createIndex({idempotencyKey:1},{unique:true}),
    db.collection('orders').createIndex({reference:1},{unique:true}),
    db.collection('limits').createIndex({expires:1},{expireAfterSeconds:0}),
  ]).then(()=>{}).catch(error=>{globals.indexes=undefined;throw error;});
  await globals.indexes;
  return db;
}
export const catalog = cache(async (): Promise<{ products: Product[]; online: boolean }> => {
  try {
    const db = await database();
    const products = await db.collection<Product>('products').find({ active: true }, { projection: { _id: 0 } }).sort({featured:-1,createdAt:-1}).toArray();
    return { products, online: true };
  } catch {
    const { default: samples } = await import('./catalog.seed.json');
    return { products: samples as Product[], online: false };
  }
});
export const secret = () => {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 48) throw new Error('Session secret is not configured.');
  return value;
};
const signature = (payload: string) => createHmac('sha256', secret() + process.env.ADMIN_PASSWORD_HASH).update(payload).digest('base64url');
export function issueSession() {
  const payload = Buffer.from(JSON.stringify({ email: process.env.ADMIN_EMAIL, expires: Date.now()+8*60*60*1000, nonce: randomBytes(16).toString('hex') })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}
export async function isAdmin(): Promise<boolean> {
  try {
    const token = (await cookies()).get('yalla_admin')?.value;
    if (!token) return false;
    const [payload, signed, extra] = token.split('.');
    if (!payload || !signed || extra) return false;
    const expected = signature(payload);
    if (signed.length !== expected.length || !timingSafeEqual(Buffer.from(signed), Buffer.from(expected))) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.email === process.env.ADMIN_EMAIL && data.expires > Date.now();
  } catch { return false; }
}
export function checkPassword(input: string) {
  const [salt, expected] = (process.env.ADMIN_PASSWORD_HASH || '').split(':');
  if (!salt || !expected || input.length > 200) return false;
  const actual = scryptSync(input, salt, 64);
  const stored = Buffer.from(expected, 'hex');
  return stored.length === actual.length && timingSafeEqual(actual, stored);
}
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  const allowed = new Set([req.nextUrl.origin]);
  const configured = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) allowed.add(new URL(configured).origin);
  // NextURL canonicalizes loopback IPs to localhost. Preserve the browser's
  // actual local origin, without trusting arbitrary forwarded host headers.
  const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
  const host = req.headers.get('host');
  if (host && loopback.has(req.nextUrl.hostname)) {
    const actual = new URL(`${req.nextUrl.protocol}//${host}`);
    if (loopback.has(actual.hostname) && actual.port === req.nextUrl.port) allowed.add(actual.origin);
  }
  if (!origin || !allowed.has(origin)) throw new ApiError(403, 'Please submit this request from the store.');
}
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function rateLimit(key: string, max: number, windowMs: number) {
  const db = await database();
  const bucket = Math.floor(Date.now()/windowMs);
  const id = createHmac('sha256', secret()).update(`${key}:${bucket}`).digest('hex');
  const row = await db.collection<{_id:string; count:number; expires:Date}>('limits').findOneAndUpdate({_id:id}, {$inc:{count:1},$setOnInsert:{expires:new Date((bucket+2)*windowMs)}}, {upsert:true,returnDocument:'after'});
  if ((row?.count || 0) > max) throw new ApiError(429, 'Too many attempts. Please try again later.');
}
