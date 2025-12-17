// src/lib/socket.ts
import { io, Socket, ManagerOptions, SocketOptions } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace("/api", "") ||
  "http://localhost:5000";

let socket: Socket | null = null;

/**
 * Initialize or return existing Socket.IO connection
 * Automatically attaches JWT token from localStorage (same as your apiClient)
 */
export const initSocket = (): Socket | null => {
  // Reuse existing connected socket
  if (socket?.connected) {
    return socket;
  }

  // Avoid double initialization
  if (socket) {
    return socket;
  }

  const token = localStorage.getItem("token");
  const DEV_TOKEN = import.meta.env.VITE_DEV_TOKEN || null;

  const authToken = token || DEV_TOKEN;

  const options: Partial<ManagerOptions & SocketOptions> = {
    transports: ["websocket", "polling"], // websocket first, fallback to polling
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
    // Only send auth if we have a token
    ...(authToken
      ? {
          auth: {
            token: authToken,
          },
        }
      : {}),
    withCredentials: true,
  };

  socket = io(SOCKET_URL, options);

  // Connection lifecycle logs (remove in full prod if too verbose)
  socket.on("connect", () => {
    console.log("✅ Socket.IO connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.warn("⚠️ Socket.IO disconnected:", reason);
    if (reason === "io server disconnect") {
      // Server forced disconnect → try reconnect
      socket?.connect();
    }
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket.IO connection error:", error.message);
  });

  // Optional: Listen for server-sent auth failure
  socket.on("auth_error", (msg: string) => {
    console.error("🚫 Socket auth failed:", msg);
    disconnectSocket(); // Clean up invalid session
  });

  return socket;
};

/**
 * Get current socket instance (initializes if needed)
 */
export const getSocket = (): Socket | null => {
  if (!socket) {
    initSocket();
  }
  return socket;
};

/**
 * Disconnect and cleanup socket
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("🔌 Socket.IO manually disconnected");
  }
};

/**
 * Join a room (e.g., 'kitchen', 'admin', 'rider-123')
 */
export const joinRoom = (room: string): void => {
  const s = getSocket();
  if (s?.connected) {
    s.emit("join", room);
    console.log(`Joined room: ${room}`);
  }
};

/**
 * Leave a room
 */
export const leaveRoom = (room: string): void => {
  const s = getSocket();
  if (s?.connected) {
    s.emit("leave", room);
    console.log(`Left room: ${room}`);
  }
};

/**
 * Reconnect with fresh token (useful after login/logout)
 */
export const reconnectWithNewToken = (): void => {
  disconnectSocket();
  initSocket(); // Will pick up new token from localStorage
};