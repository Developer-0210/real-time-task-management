import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { publishUpdate } from "@/lib/redis"
import { cacheManager, CACHE_KEYS, CACHE_TTL } from "@/lib/cache"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const project = await cacheManager.getOrSet(
      CACHE_KEYS.PROJECT(Number.parseInt(params.id)),
      async () => {
        const result = await query("SELECT * FROM projects WHERE id = $1", [params.id])
        return result.rows[0] || null
      },
      CACHE_TTL.LONG,
    )

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json(project, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        "X-Cache": "HIT",
      },
    })
  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, description, metadata } = await request.json()

    const result = await query(
      "UPDATE projects SET name = $1, description = $2, metadata = $3 WHERE id = $4 RETURNING *",
      [name, description, metadata, params.id],
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const project = result.rows[0]

    await cacheManager.invalidateMultiple([
      CACHE_KEYS.PROJECT(project.id),
      CACHE_KEYS.PROJECTS_LIST,
      CACHE_KEYS.PROJECT_TASKS(project.id),
    ])

    // Update cache with new data
    await cacheManager.setWithTags(CACHE_KEYS.PROJECT(project.id), project, CACHE_TTL.LONG, [
      "projects",
      `project:${project.id}`,
    ])

    // Publish update to all clients
    await publishUpdate("projects", { type: "updated", data: project })

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error updating project:", error)
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await query("DELETE FROM projects WHERE id = $1 RETURNING *", [params.id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    await cacheManager.invalidatePattern(`*project:${params.id}*`)
    await cacheManager.invalidateByTag("projects")

    // Publish update to all clients
    await publishUpdate("projects", { type: "deleted", data: { id: params.id } })

    return NextResponse.json({ message: "Project deleted successfully" })
  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}
