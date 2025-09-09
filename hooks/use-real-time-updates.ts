"use client"

import { useState, useCallback } from "react"
import { useWebSocket } from "./use-websocket"
import type { Project, Task, Comment } from "@/lib/db"

interface RealTimeState {
  projects: Project[]
  tasks: Task[]
  comments: Comment[]
  typingUsers: Record<string, { clientId: string; taskId: number; timestamp: string }>
  onlineUsers: string[]
}

interface CommentCallbacks {
  onCommentAdded?: (comment: Comment) => void
  onCommentUpdated?: (comment: Comment) => void
  onCommentDeleted?: (commentId: number) => void
}

interface TaskCallbacks {
  onTaskUpdated?: (task: Task) => void
  onTaskDeleted?: (taskId: number) => void
}

interface ProjectCallbacks {
  onProjectUpdated?: (project: Project) => void
  onProjectDeleted?: (projectId: number) => void
}

export function useRealTimeUpdates(callbacks?: {
  comments?: CommentCallbacks
  tasks?: TaskCallbacks
  projects?: ProjectCallbacks
}) {
  const [state, setState] = useState<RealTimeState>({
    projects: [],
    tasks: [],
    comments: [],
    typingUsers: {},
    onlineUsers: [], // Always empty when real-time is disabled
  })

  const handleMessage = useCallback(
    (message: any) => {
      if (message.type === "connected") {
        console.log("[v0] Mock real-time connection established")
      }
      // All other message types are ignored since real-time is disabled
    },
    [callbacks],
  )

  const handleDataUpdate = useCallback(
    (channel: string, data: any) => {
      setState((prev) => {
        switch (channel) {
          case "projects":
            const updatedProjects = updateProjects(prev, data)
            if (data.type === "updated" && callbacks?.projects?.onProjectUpdated) {
              callbacks.projects.onProjectUpdated(data.data)
            } else if (data.type === "deleted" && callbacks?.projects?.onProjectDeleted) {
              callbacks.projects.onProjectDeleted(data.data.id)
            }
            return updatedProjects
          case "tasks":
            const updatedTasks = updateTasks(prev, data)
            if (data.type === "updated" && callbacks?.tasks?.onTaskUpdated) {
              callbacks.tasks.onTaskUpdated(data.data)
            } else if (data.type === "deleted" && callbacks?.tasks?.onTaskDeleted) {
              callbacks.tasks.onTaskDeleted(data.data.id)
            }
            return updatedTasks
          case "comments":
            const updatedComments = updateComments(prev, data)
            if (data.type === "created" && callbacks?.comments?.onCommentAdded) {
              callbacks.comments.onCommentAdded(data.data)
            } else if (data.type === "updated" && callbacks?.comments?.onCommentUpdated) {
              callbacks.comments.onCommentUpdated(data.data)
            } else if (data.type === "deleted" && callbacks?.comments?.onCommentDeleted) {
              callbacks.comments.onCommentDeleted(data.data.id)
            }
            return updatedComments
          default:
            return prev
        }
      })
    },
    [callbacks],
  )

  const handleTypingUpdate = useCallback((message: any) => {
    setState((prev) => {
      const newTypingUsers = { ...prev.typingUsers }
      const key = `${message.clientId}-${message.taskId}`

      if (message.isTyping) {
        newTypingUsers[key] = {
          clientId: message.clientId,
          taskId: message.taskId,
          timestamp: message.timestamp,
        }
      } else {
        delete newTypingUsers[key]
      }

      return {
        ...prev,
        typingUsers: newTypingUsers,
      }
    })
  }, [])

  const { isConnected, clientId, sendMessage } = useWebSocket({
    onMessage: handleMessage,
  })

  // Helper functions for updating state
  const updateProjects = (state: RealTimeState, update: any): RealTimeState => {
    switch (update.type) {
      case "created":
        return {
          ...state,
          projects: [...state.projects, update.data],
        }
      case "updated":
        return {
          ...state,
          projects: state.projects.map((p) => (p.id === update.data.id ? update.data : p)),
        }
      case "deleted":
        return {
          ...state,
          projects: state.projects.filter((p) => p.id !== update.data.id),
        }
      default:
        return state
    }
  }

  const updateTasks = (state: RealTimeState, update: any): RealTimeState => {
    switch (update.type) {
      case "created":
        return {
          ...state,
          tasks: [...state.tasks, update.data],
        }
      case "updated":
        return {
          ...state,
          tasks: state.tasks.map((t) => (t.id === update.data.id ? update.data : t)),
        }
      case "deleted":
        return {
          ...state,
          tasks: state.tasks.filter((t) => t.id !== update.data.id),
        }
      default:
        return state
    }
  }

  const updateComments = (state: RealTimeState, update: any): RealTimeState => {
    switch (update.type) {
      case "created":
        return {
          ...state,
          comments: [...state.comments, update.data],
        }
      case "updated":
        return {
          ...state,
          comments: state.comments.map((c) => (c.id === update.data.id ? update.data : c)),
        }
      case "deleted":
        return {
          ...state,
          comments: state.comments.filter((c) => c.id !== update.data.id),
        }
      default:
        return state
    }
  }

  const joinProject = useCallback(
    (projectId: number) => {
      console.log("[v0] Mock joining project:", projectId)
      // Don't actually send message since real-time is disabled
    },
    [sendMessage],
  )

  const setTyping = useCallback(
    (taskId: number, isTyping: boolean, author?: string) => {
      console.log("[v0] Mock typing indicator:", { taskId, isTyping, author })
      // Don't actually send message since real-time is disabled
    },
    [sendMessage],
  )

  const setCursorPosition = useCallback(
    (elementId: string, position: any) => {
      console.log("[v0] Mock cursor position:", { elementId, position })
      // Don't actually send message since real-time is disabled
    },
    [sendMessage],
  )

  const joinTaskComments = useCallback(
    (taskId: number) => {
      console.log("[v0] Mock joining task comments:", taskId)
      // Don't actually send message since real-time is disabled
    },
    [sendMessage],
  )

  const leaveTaskComments = useCallback(
    (taskId: number) => {
      console.log("[v0] Mock leaving task comments:", taskId)
      // Don't actually send message since real-time is disabled
    },
    [sendMessage],
  )

  const getTypingUsersForTask = useCallback(
    (taskId: number) => {
      return []
    },
    [state.typingUsers],
  )

  return {
    ...state,
    isConnected,
    clientId,
    joinProject,
    setTyping,
    setCursorPosition,
    joinTaskComments,
    leaveTaskComments,
    getTypingUsersForTask,
  }
}
