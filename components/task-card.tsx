"use client"

import { useState } from "react"
import { Calendar, User, MessageSquare, MoreHorizontal, Edit, Trash2, LinkIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog } from "@/components/ui/dialog"
import { EditTaskDialog } from "./edit-task-dialog"
import { TaskCommentsDialog } from "./task-comments-dialog"
import { useRealTimeUpdates } from "@/hooks/use-real-time-updates"
import type { Task } from "@/lib/db"

interface TaskCardProps {
  task: Task
  onUpdate: (task: Task) => void
  onDelete: (taskId: number) => void
  projectId: number
  isDragging?: boolean
}

export function TaskCard({ task, onUpdate, onDelete, projectId, isDragging }: TaskCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [commentCount, setCommentCount] = useState(0)

  const { getTypingUsersForTask } = useRealTimeUpdates({
    comments: {
      onCommentAdded: (comment) => {
        if (comment.task_id === task.id) {
          setCommentCount((prev) => prev + 1)
        }
      },
      onCommentDeleted: (commentId) => {
        // Note: We'd need the task_id in the delete event to properly track this
        // For now, we'll refresh the count when the dialog opens
      },
    },
  })

  const typingUsers = getTypingUsersForTask(task.id)
  const hasTypingUsers = false

  useState(() => {
    const fetchCommentCount = async () => {
      try {
        const response = await fetch(`/api/comments?taskId=${task.id}`)
        if (response.ok) {
          const comments = await response.json()
          setCommentCount(comments.length)
        }
      } catch (error) {
        console.error("Error fetching comment count:", error)
      }
    }
    fetchCommentCount()
  })

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        onDelete(task.id)
      }
    } catch (error) {
      console.error("Error deleting task:", error)
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive text-destructive-foreground"
      case "medium":
        return "bg-primary text-primary-foreground"
      case "low":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  return (
    <>
      <Card
        className={`cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
          isDragging ? "shadow-lg ring-2 ring-primary" : ""
        }`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-sm font-medium text-balance leading-tight">{task.title}</CardTitle>
              {task.configuration.description && (
                <CardDescription className="text-xs mt-1 text-pretty">{task.configuration.description}</CardDescription>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Edit className="w-3 h-3 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCommentsDialogOpen(true)}>
                  <MessageSquare className="w-3 h-3 mr-2" />
                  Comments
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Priority Badge */}
          <Badge className={`text-xs ${getPriorityColor(task.configuration.priority)}`}>
            {task.configuration.priority} priority
          </Badge>

          {/* Tags */}
          {task.configuration.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.configuration.tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {task.configuration.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{task.configuration.tags.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Dependencies Warning */}
          {task.dependencies.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <LinkIcon className="w-3 h-3" />
              {task.dependencies.length} dependencies
            </div>
          )}

          {/* Assigned Users */}
          {task.assigned_to.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              {task.assigned_to.length} assigned
            </div>
          )}

          {/* Created Date */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {formatDate(task.created_at)}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className={`w-full h-7 text-xs relative ${hasTypingUsers ? "bg-accent/50" : ""}`}
            onClick={() => setIsCommentsDialogOpen(true)}
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            Comments
            {commentCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 text-xs">
                {commentCount}
              </Badge>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <EditTaskDialog
          task={task}
          onTaskUpdated={(updatedTask) => {
            onUpdate(updatedTask)
            setIsEditDialogOpen(false)
          }}
          projectId={projectId}
        />
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={isCommentsDialogOpen} onOpenChange={setIsCommentsDialogOpen}>
        <TaskCommentsDialog taskId={task.id} />
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone and will also delete all
              associated comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
