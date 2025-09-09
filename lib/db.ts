import { Pool } from "pg"

let pool: Pool | null = null

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    })
  }
  return pool
}

export async function query(text: string, params?: any[]) {
  const pool = getPool()
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

// Database types
export interface Project {
  id: number
  name: string
  description?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Task {
  id: number
  project_id: number
  title: string
  status: "todo" | "in-progress" | "done" | "blocked"
  assigned_to: number[]
  configuration: {
    priority: "low" | "medium" | "high"
    description: string
    tags: string[]
    customFields: Record<string, any>
  }
  dependencies: number[]
  created_at: string
  updated_at: string
}

export interface Comment {
  id: number
  task_id: number
  content: string
  author: string
  timestamp: string
}
