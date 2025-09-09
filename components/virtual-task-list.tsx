"use client"

import type React from "react"

import { useMemo, useState } from "react"
import { FixedSizeList as List } from "react-window"
import { TaskCard } from "./task-card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"
import type { Task } from "@/lib/db"

interface VirtualTaskListProps {
  tasks: Task[]
  onTaskUpdate: (task: Task) => void
  onTaskDelete: (taskId: number) => void
  projectId: number
  height?: number
}

const ITEM_HEIGHT = 200 // Approximate height of each task card

export function VirtualTaskList({ tasks, onTaskUpdate, onTaskDelete, projectId, height = 600 }: VirtualTaskListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  // Debounced search to avoid excessive filtering
  const debouncedSearch = useDebouncedCallback((query: string) => {
    setSearchQuery(query)
  }, 300)

  // Memoized filtered tasks for performance
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.configuration.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.configuration.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      const matchesPriority = priorityFilter === "all" || task.configuration.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [tasks, searchQuery, statusFilter, priorityFilter])

  // Row renderer for react-window
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const task = filteredTasks[index]
    if (!task) return null

    return (
      <div style={style} className="px-2 py-1">
        <TaskCard task={task} onUpdate={onTaskUpdate} onDelete={onTaskDelete} projectId={projectId} viewMode="list" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input placeholder="Search tasks..." onChange={(e) => debouncedSearch(e.target.value)} className="pl-10" />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Virtual List */}
      <div className="border rounded-lg">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No tasks found matching your filters.</div>
        ) : (
          <List
            height={height}
            itemCount={filteredTasks.length}
            itemSize={ITEM_HEIGHT}
            overscanCount={5} // Render 5 extra items for smooth scrolling
          >
            {Row}
          </List>
        )}
      </div>

      <div className="text-sm text-muted-foreground text-center">
        Showing {filteredTasks.length} of {tasks.length} tasks
      </div>
    </div>
  )
}
