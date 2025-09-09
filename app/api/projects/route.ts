import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { publishUpdate } from "@/lib/redis"
import { cacheManager, CACHE_KEYS, CACHE_TTL } from "@/lib/cache"
import { createRateLimitMiddleware } from "@/lib/rate-limiter"

// Rate limiting configuration
const rateLimitMiddleware = createRateLimitMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
})

export async function GET(request: NextRequest) {
  const clientIP = request.headers.get("x-forwarded-for") || "unknown"
  const rateLimitResult = await rateLimitMiddleware(request, clientIP)
  if (rateLimitResult) return rateLimitResult

  try {
    const projects = await cacheManager.getOrSet(
      CACHE_KEYS.PROJECTS_LIST,
      async () => {
        const result = await query("SELECT * FROM projects ORDER BY updated_at DESC")
        return result.rows
      },
      CACHE_TTL.MEDIUM,
    )

    return NextResponse.json(projects, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-Cache": "HIT",
      },
    })
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const clientIP = request.headers.get("x-forwarded-for") || "unknown"
  const createRateLimit = await createRateLimitMiddleware({
    windowMs: 60 * 1000,
    maxRequests: 10, // More restrictive for creates
  })(request, `create:${clientIP}`)
  if (createRateLimit) return createRateLimit

  try {
    const { name, description, metadata = {} } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const result = await query("INSERT INTO projects (name, description, metadata) VALUES ($1, $2, $3) RETURNING *", [
      name,
      description,
      metadata,
    ])

    const project = result.rows[0]

    await cacheManager.setWithTags(CACHE_KEYS.PROJECT(project.id), project, CACHE_TTL.LONG, [
      "projects",
      `project:${project.id}`,
    ])

    // Invalidate projects list cache
    await cacheManager.invalidateByTag("projects")

    // Publish update to all clients
    await publishUpdate("projects", { type: "created", data: project })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}
