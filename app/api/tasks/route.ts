import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { publishUpdate } from "@/lib/redis"
import { cacheManager, CACHE_KEYS, CACHE_TTL } from "@/lib/cache"
import { createRateLimitMiddleware } from "@/lib/rate-limiter"

const rateLimitMiddleware = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  maxRequests: 200, // Higher limit for tasks as they're accessed frequently
})

export async function GET(request: NextRequest) {
  const clientIP = request.headers.get("x-forwarded-for") || "unknown"
  const rateLimitResult = await rateLimitMiddleware(request, clientIP)
  if (rateLimitResult) return rateLimitResult

  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    if (projectId) {
      const tasks = await cacheManager.getOrSet(
        CACHE_KEYS.PROJECT_TASKS(Number.parseInt(projectId)),
        async () => {
          const result = await query("SELECT * FROM tasks WHERE project_id = $1 ORDER BY updated_at DESC", [projectId])
          return result.rows
        },
        CACHE_TTL.SHORT, // Shorter TTL for frequently changing data
      )

      return NextResponse.json(tasks, {
        headers: {
          "Cache-Control": "public, s-maxage=180, stale-while-revalidate=360",
        },
      })
    }

    const result = await query("SELECT * FROM tasks ORDER BY updated_at DESC")
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const clientIP = request.headers.get("x-forwarded-for") || "unknown"
  const createRateLimit = await createRateLimitMiddleware({
    windowMs: 60 * 1000,
    maxRequests: 20,
  })(request, `create_task:${clientIP}`)
  if (createRateLimit) return createRateLimit

  try {
    const {
      project_id,
      title,
      status = "todo",
      assigned_to = [],
      configuration = { priority: "medium", description: "", tags: [], customFields: {} },
      dependencies = [],
    } = await request.json()

    if (!project_id || !title) {
      return NextResponse.json({ error: "Project ID and title are required" }, { status: 400 })
    }

    const result = await query(
      "INSERT INTO tasks (project_id, title, status, assigned_to, configuration, dependencies) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [project_id, title, status, assigned_to, configuration, dependencies],
    )

    const task = result.rows[0]

    await cacheManager.setWithTags(CACHE_KEYS.TASK(task.id), task, CACHE_TTL.MEDIUM, [
      "tasks",
      `project:${project_id}`,
      `task:${task.id}`,
    ])

    // Invalidate project tasks cache
    await cacheManager.invalidateMultiple([CACHE_KEYS.PROJECT_TASKS(project_id)])

    // Publish update to all clients
    await publishUpdate("tasks", { type: "created", data: task })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}
