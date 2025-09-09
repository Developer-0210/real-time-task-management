import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const taskId = searchParams.get("taskId")

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      const sendEvent = (data: any) => {
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        } catch (error) {
          console.error("Error sending SSE event:", error)
        }
      }

      // Send initial connection message
      sendEvent({
        type: "connected",
        clientId: Math.random().toString(36).substring(2),
        timestamp: new Date().toISOString(),
      })

      const heartbeat = setInterval(() => {
        try {
          sendEvent({
            type: "heartbeat",
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          clearInterval(heartbeat)
        }
      }, 30000)

      // Handle client disconnect
      const cleanup = () => {
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch (error) {
          // Connection already closed
        }
      }

      request.signal.addEventListener("abort", cleanup)

      // Auto-cleanup after 5 minutes to prevent memory leaks
      setTimeout(cleanup, 5 * 60 * 1000)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}
