import Redis from "ioredis"

let redis: Redis | null = null

export function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379")
  }
  return redis
}

export async function cacheSet(key: string, value: any, ttl = 300) {
  const client = getRedis()
  await client.setex(key, ttl, JSON.stringify(value))
}

export async function cacheGet(key: string) {
  const client = getRedis()
  const value = await client.get(key)
  return value ? JSON.parse(value) : null
}

export async function cacheDelete(key: string) {
  const client = getRedis()
  await client.del(key)
}

export async function publishUpdate(channel: string, data: any) {
  const client = getRedis()
  await client.publish(channel, JSON.stringify(data))
}
