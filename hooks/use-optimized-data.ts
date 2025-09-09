"use client"

import useSWR from "swr"
import { useCallback } from "react"

// Optimized fetcher with error handling and retries
const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    const error = new Error("Failed to fetch")
    error.message = await response.text()
    throw error
  }
  return response.json()
}

// SWR configuration for optimal performance
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  refreshInterval: 30000, // 30 seconds
  dedupingInterval: 5000, // 5 seconds
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  onErrorRetry: (error: any, key: string, config: any, revalidate: any, { retryCount }: any) => {
    // Exponential backoff
    setTimeout(() => revalidate({ retryCount }), Math.min(1000 * Math.pow(2, retryCount), 10000))
  },
}

export function useProjects() {
  const { data, error, mutate, isLoading } = useSWR("/api/projects", fetcher, swrConfig)

  const createProject = useCallback(
    async (projectData: any) => {
      // Optimistic update
      const optimisticProject = {
        id: Date.now(),
        ...projectData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mutate([optimisticProject, ...(data || [])], false)

      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectData),
        })

        if (!response.ok) throw new Error("Failed to create project")

        const newProject = await response.json()
        mutate([newProject, ...(data || []).filter((p: any) => p.id !== optimisticProject.id)])
        return newProject
      } catch (error) {
        // Revert optimistic update
        mutate(data)
        throw error
      }
    },
    [data, mutate],
  )

  return {
    projects: data || [],
    isLoading,
    error,
    createProject,
    mutate,
  }
}

export function useProjectTasks(projectId: number) {
  const { data, error, mutate, isLoading } = useSWR(projectId ? `/api/tasks?projectId=${projectId}` : null, fetcher, {
    ...swrConfig,
    refreshInterval: 15000, // More frequent updates for tasks
  })

  const updateTask = useCallback(
    async (taskId: number, updates: any) => {
      // Optimistic update
      const optimisticData = data?.map((task: any) => (task.id === taskId ? { ...task, ...updates } : task))
      mutate(optimisticData, false)

      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })

        if (!response.ok) throw new Error("Failed to update task")

        const updatedTask = await response.json()
        mutate(data?.map((task: any) => (task.id === taskId ? updatedTask : task)))
        return updatedTask
      } catch (error) {
        // Revert optimistic update
        mutate(data)
        throw error
      }
    },
    [data, mutate],
  )

  return {
    tasks: data || [],
    isLoading,
    error,
    updateTask,
    mutate,
  }
}

export function useTaskComments(taskId: number) {
  const { data, error, mutate, isLoading } = useSWR(taskId ? `/api/comments?taskId=${taskId}` : null, fetcher, {
    ...swrConfig,
    refreshInterval: 10000, // Very frequent for real-time feel
  })

  const addComment = useCallback(
    async (content: string, author: string) => {
      const optimisticComment = {
        id: Date.now(),
        task_id: taskId,
        content,
        author,
        timestamp: new Date().toISOString(),
      }

      mutate([...(data || []), optimisticComment], false)

      try {
        const response = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_id: taskId, content, author }),
        })

        if (!response.ok) throw new Error("Failed to add comment")

        const newComment = await response.json()
        mutate([...(data || []).filter((c: any) => c.id !== optimisticComment.id), newComment])
        return newComment
      } catch (error) {
        mutate(data)
        throw error
      }
    },
    [data, mutate, taskId],
  )

  return {
    comments: data || [],
    isLoading,
    error,
    addComment,
    mutate,
  }
}
