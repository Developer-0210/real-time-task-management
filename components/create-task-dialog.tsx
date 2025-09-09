"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import type { Task } from "@/lib/db"

interface CreateTaskDialogProps {
  projectId: number
  onTaskCreated: (task: Task) => void
  availableTasks: Task[]
}

export function CreateTaskDialog({ projectId, onTaskCreated, availableTasks }: CreateTaskDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    tags: [] as string[],
    dependencies: [] as number[],
  })
  const [newTag, setNewTag] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          title: formData.title,
          status: formData.status,
          assigned_to: [],
          configuration: {
            priority: formData.priority,
            description: formData.description,
            tags: formData.tags,
            customFields: {},
          },
          dependencies: formData.dependencies,
        }),
      })

      if (response.ok) {
        const task = await response.json()
        onTaskCreated(task)
        setFormData({
          title: "",
          description: "",
          priority: "medium",
          status: "todo",
          tags: [],
          dependencies: [],
        })
      }
    } catch (error) {
      console.error("Error creating task:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      })
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogDescription>
          Add a new task to your project. You can set priority, dependencies, and organize with tags.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Task Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter task title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the task requirements and goals"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Initial Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a tag"
              className="flex-1"
            />
            <Button type="button" onClick={addTag} variant="outline">
              Add
            </Button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Dependencies */}
        {availableTasks.length > 0 && (
          <div className="space-y-2">
            <Label>Dependencies</Label>
            <Select
              value=""
              onValueChange={(value) => {
                const taskId = Number.parseInt(value)
                if (!formData.dependencies.includes(taskId)) {
                  setFormData({
                    ...formData,
                    dependencies: [...formData.dependencies, taskId],
                  })
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select dependent tasks" />
              </SelectTrigger>
              <SelectContent>
                {availableTasks
                  .filter((task) => !formData.dependencies.includes(task.id))
                  .map((task) => (
                    <SelectItem key={task.id} value={task.id.toString()}>
                      {task.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {formData.dependencies.length > 0 && (
              <div className="space-y-1">
                {formData.dependencies.map((depId) => {
                  const depTask = availableTasks.find((t) => t.id === depId)
                  return depTask ? (
                    <div key={depId} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                      <span>{depTask.title}</span>
                      <X
                        className="w-4 h-4 cursor-pointer"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            dependencies: formData.dependencies.filter((id) => id !== depId),
                          })
                        }
                      />
                    </div>
                  ) : null
                })}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="submit" disabled={isSubmitting || !formData.title.trim()}>
            {isSubmitting ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
