// Server-side WebSocket utilities for handling connections
import { WebSocketServer } from "ws"
import { getRedis } from "./redis"

export class CollaborativeWebSocketServer {
  private wss: WebSocketServer
  private clients = new Map<string, any>()
  private projectRooms = new Map<number, Set<string>>()

  constructor(server: any) {
    this.wss = new WebSocketServer({ server })
    this.setupRedisSubscription()
    this.setupConnectionHandling()
  }

  private setupRedisSubscription() {
    const redis = getRedis()
    const subscriber = redis.duplicate()

    subscriber.subscribe("projects", "tasks", "comments", "presence")

    subscriber.on("message", (channel, message) => {
      const data = JSON.parse(message)
      this.broadcastToRelevantClients(channel, data)
    })
  }

  private setupConnectionHandling() {
    this.wss.on("connection", (ws, request) => {
      const clientId = this.generateClientId()

      this.clients.set(clientId, {
        ws,
        projectId: null,
        lastActivity: Date.now(),
      })

      ws.on("message", (data) => {
        this.handleClientMessage(clientId, JSON.parse(data.toString()))
      })

      ws.on("close", () => {
        this.handleClientDisconnect(clientId)
      })

      // Send connection confirmation
      ws.send(
        JSON.stringify({
          type: "connected",
          clientId,
          timestamp: new Date().toISOString(),
        }),
      )
    })
  }

  private handleClientMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId)
    if (!client) return

    client.lastActivity = Date.now()

    switch (message.type) {
      case "join_project":
        this.joinProjectRoom(clientId, message.projectId)
        break
      case "leave_project":
        this.leaveProjectRoom(clientId, message.projectId)
        break
      case "typing":
        this.handleTypingIndicator(clientId, message)
        break
    }
  }

  private joinProjectRoom(clientId: string, projectId: number) {
    const client = this.clients.get(clientId)
    if (!client) return

    // Leave previous room if any
    if (client.projectId) {
      this.leaveProjectRoom(clientId, client.projectId)
    }

    // Join new room
    if (!this.projectRooms.has(projectId)) {
      this.projectRooms.set(projectId, new Set())
    }

    this.projectRooms.get(projectId)!.add(clientId)
    client.projectId = projectId

    // Notify room members
    this.broadcastToProjectRoom(
      projectId,
      {
        type: "user_joined",
        clientId,
        projectId,
        timestamp: new Date().toISOString(),
      },
      clientId,
    )
  }

  private leaveProjectRoom(clientId: string, projectId: number) {
    const room = this.projectRooms.get(projectId)
    if (room) {
      room.delete(clientId)
      if (room.size === 0) {
        this.projectRooms.delete(projectId)
      }
    }

    const client = this.clients.get(clientId)
    if (client) {
      client.projectId = null
    }

    // Notify room members
    this.broadcastToProjectRoom(
      projectId,
      {
        type: "user_left",
        clientId,
        projectId,
        timestamp: new Date().toISOString(),
      },
      clientId,
    )
  }

  private handleClientDisconnect(clientId: string) {
    const client = this.clients.get(clientId)
    if (client && client.projectId) {
      this.leaveProjectRoom(clientId, client.projectId)
    }
    this.clients.delete(clientId)
  }

  private broadcastToProjectRoom(projectId: number, message: any, excludeClientId?: string) {
    const room = this.projectRooms.get(projectId)
    if (!room) return

    const messageStr = JSON.stringify(message)

    room.forEach((clientId) => {
      if (clientId !== excludeClientId) {
        const client = this.clients.get(clientId)
        if (client && client.ws.readyState === 1) {
          // WebSocket.OPEN
          client.ws.send(messageStr)
        }
      }
    })
  }

  private broadcastToRelevantClients(channel: string, data: any) {
    // Broadcast updates based on the channel and data context
    const message = JSON.stringify({
      type: "update",
      channel,
      data,
    })

    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === 1) {
        // WebSocket.OPEN
        client.ws.send(message)
      }
    })
  }

  private handleTypingIndicator(clientId: string, message: any) {
    const client = this.clients.get(clientId)
    if (!client || !client.projectId) return

    this.broadcastToProjectRoom(
      client.projectId,
      {
        type: "user_typing",
        clientId,
        taskId: message.taskId,
        isTyping: message.isTyping,
        timestamp: new Date().toISOString(),
      },
      clientId,
    )
  }

  private generateClientId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }
}
