import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { publishUpdate } from "@/lib/redis"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get("taskId")

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    const result = await query("SELECT * FROM comments WHERE task_id = $1 ORDER BY timestamp ASC", [taskId])

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { task_id, content, author } = await request.json()

    if (!task_id || !content || !author) {
      return NextResponse.json({ error: "Task ID, content, and author are required" }, { status: 400 })
    }

    const result = await query("INSERT INTO comments (task_id, content, author) VALUES ($1, $2, $3) RETURNING *", [
      task_id,
      content,
      author,
    ])

    const comment = result.rows[0]

    // Publish update to all clients
    await publishUpdate("comments", { type: "created", data: comment })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error("Error creating comment:", error)
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 })
  }
}
