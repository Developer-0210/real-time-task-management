"use client"

import { useState } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { TaskCard } from "./task-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Task } from "@/lib/db"

interface TaskBoardProps {
  tasks: Task[]
  onTaskUpdate: (task: Task) => void
  onTaskDelete: (taskId: number) => void
  projectId: number
}

const COLUMNS = [
  { id: "todo", title: "To Do", color: "bg-muted" },
  { id: "in-progress", title: "In Progress", color: "bg-primary" },
  { id: "done", title: "Done", color: "bg-secondary" },
  { id: "blocked", title: "Blocked", color: "bg-destructive" },
] as const

export function TaskBoard({ tasks, onTaskUpdate, onTaskDelete, projectId }: TaskBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status)
  }

  const handleDragStart = (start: any) => {
    const task = tasks.find((t) => t.id.toString() === start.draggableId)
    setDraggedTask(task || null)
  }

  const handleDragEnd = async (result: DropResult) => {
    setDraggedTask(null)

    if (!result.destination) return

    const taskId = Number.parseInt(result.draggableId)
    const newStatus = result.destination.droppableId as Task["status"]

    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return

    // Optimistically update the task
    const updatedTask = { ...task, status: newStatus }
    onTaskUpdate(updatedTask)

    // Update on server
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...task,
          status: newStatus,
        }),
      })

      if (response.ok) {
        const serverTask = await response.json()
        onTaskUpdate(serverTask)
      } else {
        // Revert on error
        onTaskUpdate(task)
      }
    } catch (error) {
      console.error("Error updating task:", error)
      // Revert on error
      onTaskUpdate(task)
    }
  }

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {COLUMNS.map((column) => {
          const columnTasks = getTasksByStatus(column.id)

          return (
            <Card key={column.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                  {column.title}
                  <span className="text-muted-foreground">({columnTasks.length})</span>
                </CardTitle>
              </CardHeader>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <CardContent
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-3 min-h-[200px] transition-colors ${
                      snapshot.isDraggingOver ? "bg-accent/50" : ""
                    }`}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`transition-transform ${snapshot.isDragging ? "rotate-2 scale-105" : ""}`}
                          >
                            <TaskCard
                              task={task}
                              onUpdate={onTaskUpdate}
                              onDelete={onTaskDelete}
                              projectId={projectId}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {columnTasks.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        No tasks in {column.title.toLowerCase()}
                      </div>
                    )}
                  </CardContent>
                )}
              </Droppable>
            </Card>
          )
        })}
      </div>
    </DragDropContext>
  )
}
