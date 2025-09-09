import { getRedis, cacheGet, cacheSet } from "./redis"

// Cache keys and TTL constants
export const CACHE_KEYS = {
  PROJECTS_LIST: "projects:list",
  PROJECT: (id: number) => `project:${id}`,
  PROJECT_TASKS: (projectId: number) => `project:${projectId}:tasks`,
  TASK: (id: number) => `task:${id}`,
  TASK_COMMENTS: (taskId: number) => `task:${taskId}:comments`,
  USER_PROJECTS: (userId: string) => `user:${userId}:projects`,
} as const

export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const

// Enhanced caching utilities
export class CacheManager {
  private redis = getRedis()

  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl: number = CACHE_TTL.MEDIUM): Promise<T> {
    try {
      const cached = await cacheGet(key)
      if (cached !== null) {
        return cached as T
      }

      const data = await fetcher()
      await cacheSet(key, data, ttl)
      return data
    } catch (error) {
      console.error("Cache error:", error)
      // Fallback to direct fetch if cache fails
      return await fetcher()
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error("Cache invalidation error:", error)
    }
  }

  async invalidateMultiple(keys: string[]): Promise<void> {
    try {
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error("Cache invalidation error:", error)
    }
  }

  async setWithTags(key: string, value: any, ttl: number, tags: string[]): Promise<void> {
    try {
      await cacheSet(key, value, ttl)

      // Store tags for invalidation
      for (const tag of tags) {
        await this.redis.sadd(`tag:${tag}`, key)
        await this.redis.expire(`tag:${tag}`, ttl + 60) // Slightly longer TTL for tags
      }
    } catch (error) {
      console.error("Tagged cache set error:", error)
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
      await this.redis.del(`tag:${tag}`)
    } catch (error) {
      console.error("Tag-based cache invalidation error:", error)
    }
  }
}

export const cacheManager = new CacheManager()
