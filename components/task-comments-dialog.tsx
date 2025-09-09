"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Send, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useRealTimeUpdates } from "@/hooks/use-real-time-updates"
import type { Comment } from "@/lib/db"

interface TaskCommentsDialogProps {
  taskId: number
}

export function TaskCommentsDialog({ taskId }: TaskCommentsDialogProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { setTyping, joinTaskComments, leaveTaskComments, getTypingUsersForTask, clientId } = useRealTimeUpdates({
    comments: {
      onCommentAdded: (comment: Comment) => {
        if (comment.task_id === taskId) {
          setComments((prev) => {
            // Avoid duplicates
            if (prev.some((c) => c.id === comment.id)) return prev
            return [...prev, comment]
          })
          // Auto-scroll to bottom when new comment arrives
          setTimeout(() => scrollToBottom(), 100)
        }
      },
      onCommentUpdated: (comment: Comment) => {
        if (comment.task_id === taskId) {
          setComments((prev) => prev.map((c) => (c.id === comment.id ? comment : c)))
        }
      },
      onCommentDeleted: (commentId: number) => {
        setComments((prev) => prev.filter((c) => c.id !== commentId))
      },
    },
  })

  const typingUsers = []

  useEffect(() => {
    fetchComments()
    joinTaskComments(taskId)

    return () => {
      leaveTaskComments(taskId)
      setTyping(taskId, false)
    }
  }, [taskId, joinTaskComments, leaveTaskComments, setTyping])

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/comments?taskId=${taskId}`)
      if (response.ok) {
        const data = await response.json()
        setComments(data)
        // Auto-scroll to bottom after loading
        setTimeout(() => scrollToBottom(), 100)
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmitting(true)
    setTyping(taskId, false)

    const optimisticComment: Comment = {
      id: Date.now(), // Temporary ID
      task_id: taskId,
      content: newComment.trim(),
      author: "Current User",
      timestamp: new Date().toISOString(),
    }

    setComments((prev) => [...prev, optimisticComment])
    setNewComment("")
    scrollToBottom()

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task_id: taskId,
          content: optimisticComment.content,
          author: optimisticComment.author,
        }),
      })

      if (response.ok) {
        const serverComment = await response.json()
        setComments((prev) => prev.map((c) => (c.id === optimisticComment.id ? serverComment : c)))
      } else {
        setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id))
        setNewComment(optimisticComment.content) // Restore the text
      }
    } catch (error) {
      console.error("Error creating comment:", error)
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id))
      setNewComment(optimisticComment.content) // Restore the text
    } finally {
      setIsSubmitting(false)
      inputRef.current?.focus()
    }
  }

  const handleInputChange = (value: string) => {
    setNewComment(value)
    setTyping(taskId, value.length > 0, "Current User")

    // Stop typing indicator after 3 seconds of inactivity
    clearTimeout((window as any).typingTimeout)
    if (value.length > 0) {
      ;(window as any).typingTimeout = setTimeout(() => {
        setTyping(taskId, false)
      }, 3000)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return diffInMinutes <= 0 ? "Just now" : `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Task Comments
          <Badge variant="secondary" className="ml-2">
            {comments.length}
          </Badge>
        </DialogTitle>
        <DialogDescription>Collaborate with your team by adding comments and updates.</DialogDescription>
      </DialogHeader>

      <div className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No comments yet.</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">{getInitials(comment.author)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{comment.author}</span>
                      <span className="text-xs text-muted-foreground">{formatTimestamp(comment.timestamp)}</span>
                      {comment.id > 1000000000000 && (
                        <Badge variant="outline" className="text-xs">
                          Sending...
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-pretty">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex gap-2 mt-4 pt-4 border-t">
          <Input
            ref={inputRef}
            value={newComment}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1"
            disabled={isSubmitting}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </DialogContent>
  )
}
