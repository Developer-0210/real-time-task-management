import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { cacheSet, cacheDelete, publishUpdate } from "@/lib/redis"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await query("SELECT * FROM tasks WHERE id = $1", [params.id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error("Error fetching task:", error)
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { title, status, assigned_to, configuration, dependencies } = await request.json()

    const result = await query(
      "UPDATE tasks SET title = $1, status = $2, assigned_to = $3, configuration = $4, dependencies = $5 WHERE id = $6 RETURNING *",
      [title, status, assigned_to, configuration, dependencies, params.id],
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const task = result.rows[0]

    // Update cache
    await cacheSet(`task:${task.id}`, task)

    // Publish update to all clients
    await publishUpdate("tasks", { type: "updated", data: task })

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await query("DELETE FROM tasks WHERE id = $1 RETURNING *", [params.id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Clear cache
    await cacheDelete(`task:${params.id}`)

    // Publish update to all clients
    await publishUpdate("tasks", { type: "deleted", data: { id: params.id } })

    return NextResponse.json({ message: "Task deleted successfully" })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
