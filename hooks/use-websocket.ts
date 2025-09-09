"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface WebSocketMessage {
  type: string
  [key: string]: any
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  projectId?: string
  taskId?: string
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onMessage, onConnect, onDisconnect, onError, projectId, taskId } = options

  const [isConnected, setIsConnected] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const mockConnectionRef = useRef<boolean>(false)

  const connect = useCallback(() => {
    if (mockConnectionRef.current) {
      return
    }

    console.log("[v0] Using mock connection (real-time disabled)")

    // Simulate connection after a short delay
    setTimeout(() => {
      mockConnectionRef.current = true
      setIsConnected(true)
      setClientId(Math.random().toString(36).substring(2))
      onConnect?.()

      // Send mock connected message
      onMessage?.({
        type: "connected",
        clientId: Math.random().toString(36).substring(2),
        timestamp: new Date().toISOString(),
      })
    }, 100)
  }, [onMessage, onConnect])

  const disconnect = useCallback(() => {
    console.log("[v0] Disconnecting mock connection")
    mockConnectionRef.current = false
    setIsConnected(false)
    setClientId(null)
    onDisconnect?.()
  }, [onDisconnect])

  const sendMessage = useCallback(
    async (message: any) => {
      console.log("[v0] Mock sending message:", message.type)
      // Just log the message, don't actually send it
      return Promise.resolve()
    },
    [clientId, projectId, taskId],
  )

  // Auto-connect on mount
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    clientId,
    sendMessage,
    connect,
    disconnect,
  }
}
