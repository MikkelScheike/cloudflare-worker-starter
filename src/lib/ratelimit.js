/**
 * Rate limiting utilities for Cloudflare Workers
 * Prevents abuse and protects against spam/DoS attacks
 */

import { safeKVWrite } from './kv-utils.js';

// Rate limiting using Cloudflare KV
export async function checkRateLimit(env, identifier, action, limit, windowMs) {
  const key = `ratelimit_${action}_${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;
  
  try {
    // Get existing rate limit data
    const rateLimitData = await env.AUDIT.get(key);
    let requests = [];
    
    if (rateLimitData) {
      const parsed = JSON.parse(rateLimitData);
      // Filter out requests outside the time window
      requests = parsed.requests.filter(timestamp => timestamp > windowStart);
    }
    
    // Check if limit exceeded
    if (requests.length >= limit) {
      const oldestRequest = Math.min(...requests);
      const resetTime = oldestRequest + windowMs;
      return {
        allowed: false,
        resetTime,
        remaining: 0
      };
    }
    
    // Add current request
    requests.push(now);
    
    // Store updated data with TTL using safe KV write
    await safeKVWrite(async () => {
      await env.AUDIT.put(key, JSON.stringify({ requests }), {
        expirationTtl: Math.ceil(windowMs / 1000) + 60 // Add 1 minute buffer
      });
    }, `rate limit update for ${action}`);
    
    return {
      allowed: true,
      remaining: limit - requests.length,
      resetTime: now + windowMs
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // On error, allow the request (fail open)
    return { allowed: true, remaining: limit - 1 };
  }
}

// Helper function to get client IP (with CF headers)
export function getClientIP(request) {
  // Cloudflare provides real IP in CF-Connecting-IP header
  return request.headers.get('CF-Connecting-IP') || 
         request.headers.get('X-Forwarded-For')?.split(',')[0] || 
         '127.0.0.1';
}

// Rate limit middleware
export async function withRateLimit(env, request, action, limit, windowMs) {
  const clientIP = getClientIP(request);
  const result = await checkRateLimit(env, clientIP, action, limit, windowMs);
  
  if (!result.allowed) {
    const resetDate = new Date(result.resetTime).toISOString();
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many ${action} attempts. Try again after ${resetDate}`,
      resetTime: result.resetTime
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetTime.toString()
      }
    });
  }
  
  return null; // No rate limit hit
}
