import { getRedis } from "./redis"

interface RateLimitOptions {
  windowMs: number
  maxRequests: number
  keyGenerator?: (identifier: string) => string
}

export class RateLimiter {
  private redis = getRedis()

  async checkLimit(
    identifier: string,
    options: RateLimitOptions,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = options.keyGenerator ? options.keyGenerator(identifier) : `rate_limit:${identifier}`
    const window = Math.floor(Date.now() / options.windowMs)
    const windowKey = `${key}:${window}`

    try {
      const current = await this.redis.incr(windowKey)

      if (current === 1) {
        await this.redis.expire(windowKey, Math.ceil(options.windowMs / 1000))
      }

      const allowed = current <= options.maxRequests
      const remaining = Math.max(0, options.maxRequests - current)
      const resetTime = (window + 1) * options.windowMs

      return { allowed, remaining, resetTime }
    } catch (error) {
      console.error("Rate limiting error:", error)
      // Fail open - allow request if rate limiter fails
      return { allowed: true, remaining: options.maxRequests, resetTime: Date.now() + options.windowMs }
    }
  }
}

export const rateLimiter = new RateLimiter()

// Rate limiting middleware
export function createRateLimitMiddleware(options: RateLimitOptions) {
  return async (request: Request, identifier: string) => {
    const result = await rateLimiter.checkLimit(identifier, options)

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many requests",
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": options.maxRequests.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.resetTime.toString(),
            "Retry-After": Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          },
        },
      )
    }

    return null // Continue processing
  }
}
