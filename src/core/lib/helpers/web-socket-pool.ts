import { WebSocket } from 'ws';

export class WebSocketPool {
  sockets: Record<string, WebSocket> = {}
  aliveSockets: Record<string, boolean> = {}
  private pingInterval?: NodeJS.Timeout
  private checkInterval?: NodeJS.Timeout

  constructor() {
    this.pingInterval = setInterval(() => {
      Object.entries(this.sockets).forEach(([key, socket]) => {
        socket.ping()
        this.aliveSockets[key] = false
      })
    }, 1000);

    this.checkInterval = setInterval(() => {
      Object.entries(this.aliveSockets).forEach(([key, alive]) => {
        if (!alive) {
          this.remove(key)
        }
      })
    }, 10000);
  }

  send({ message, to }: { message: any, to: string[] }) {
    to.forEach((socketId) => {
      if (this.sockets[socketId]) {
        this.sockets[socketId].send(JSON.stringify(message));
      }
    });
  }

  remove(key: string) {
    this.sockets[key]?.terminate()
    delete this.sockets[key]
    delete this.aliveSockets[key]
  }

  append({ key, socket }: { key: string, socket: WebSocket }) {
    this.sockets[key] = socket
    this.aliveSockets[key] = true
    socket.on('pong', () => {
      this.aliveSockets[key] = true
    })
  }

  includes(arr: string[]) {
    return arr.every((key) => this.sockets[key])
  }

  clear() {
    // Terminate all sockets
    Object.values(this.sockets).forEach((socket) => {
      socket.terminate()
    })

    this.sockets = {}
    this.aliveSockets = {}

    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
  }
}