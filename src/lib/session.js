/**
 * Session management functions
 * Production-ready session handling with KV storage and security features
 */

import { getConfig } from './config.js';

export async function getSession(request, env) {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  
  const sessionCookie = cookie.split("; ").find(row => row.startsWith("session="));
  if (!sessionCookie) return null;
  
  const id = sessionCookie.split("=")[1];
  const sessionData = await env.SESSIONS.get(id);
  if (!sessionData) return null;
  
  const session = JSON.parse(sessionData);
  
  // Check if session expired
  if (session.expiresAt && session.expiresAt < Date.now()) {
    await destroySession(env, id);
    return null;
  }
  
  // Check session timeout
  const config = getConfig(env);
  if (session.lastActivity && Date.now() - session.lastActivity > config.session.timeout) {
    await destroySession(env, id);
    return null;
  }
  
  // Only update last activity if it's been more than 5 minutes (to reduce KV writes)
  const fiveMinutes = 5 * 60 * 1000;
  const shouldUpdateActivity = !session.lastActivity || (Date.now() - session.lastActivity > fiveMinutes);
  
  if (shouldUpdateActivity) {
    session.lastActivity = Date.now();
    try {
      await env.SESSIONS.put(id, JSON.stringify(session), {
        expirationTtl: getConfig(env).session.expirationTtl
      });
    } catch (error) {
      if (error.message && error.message.includes('KV put() limit exceeded')) {
        // Continue without updating session activity
        console.warn('KV write limit exceeded, skipping session update');
      } else {
        throw error;
      }
    }
  }
  
  session.id = id;
  return session;
}

export async function createSession(env, email, options = {}) {
  const sessionId = crypto.randomUUID();
  const now = Date.now();
  const config = getConfig(env);
  
  const sessionData = {
    email,
    createdAt: now,
    lastActivity: now,
    expiresAt: now + (options.maxAge || config.session.maxAge),
    userAgent: options.userAgent || "",
    ip: options.ip || ""
  };
  
  await env.SESSIONS.put(sessionId, JSON.stringify(sessionData), {
    expirationTtl: config.session.expirationTtl
  });
  
  return sessionId;
}

export async function destroySession(env, sessionId) {
  await env.SESSIONS.delete(sessionId);
}

export async function destroyAllUserSessions(env, email) {
  const allSessions = await env.SESSIONS.list();
  
  for (const session of allSessions.keys) {
    const sessionData = await env.SESSIONS.get(session.name);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      if (parsed.email === email) {
        await env.SESSIONS.delete(session.name);
      }
    }
  }
}

export function createSessionCookie(sessionId, options = {}) {
  const {
    httpOnly = true,
    secure = true,
    sameSite = "Strict",
    maxAge = 604800, // 7 days
    domain = null,
    path = "/"
  } = options;
  
  let cookie = `session=${sessionId}`;
  if (httpOnly) cookie += "; HttpOnly";
  if (secure) cookie += "; Secure";
  if (sameSite) cookie += `; SameSite=${sameSite}`;
  if (maxAge) cookie += `; Max-Age=${maxAge}`;
  if (domain) cookie += `; Domain=${domain}`;
  if (path) cookie += `; Path=${path}`;
  
  return cookie;
}
