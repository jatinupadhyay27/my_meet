import { io, Socket } from 'socket.io-client';

/**
 * Socket.io client service for real-time communication
 * 
 * This service handles:
 * - Socket connection management
 * - Meeting room join/leave
 * - Chat messaging
 * - Emoji reactions
 * 
 * NOTE: This will be extended in Day 4 for WebRTC signaling (ICE candidates, offers, answers)
 */

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

let socket: Socket | null = null;

/**
 * Connect to Socket.io server
 */
export function connectSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
}

/**
 * Join a meeting room
 * @param meetingCode - The meeting code to join
 * @param userName - The name of the user joining
 */
export function joinMeeting(meetingCode: string, userName: string): void {
  if (!socket || !socket.connected) {
    connectSocket();
  }

  if (socket) {
    socket.emit('join-meeting', {
      meetingCode,
      userName,
    });
  }
}

/**
 * Leave a meeting room
 * @param meetingCode - The meeting code to leave
 * @param userName - The name of the user leaving
 */
export function leaveMeeting(meetingCode: string, userName: string): void {
  if (socket) {
    socket.emit('leave-meeting', {
      meetingCode,
      userName,
    });
  }
}

/**
 * Send a chat message to the meeting room
 * @param meetingCode - The meeting code
 * @param message - The message text
 * @param sender - The sender's name
 */
export function sendMessage(meetingCode: string, message: string, sender: string): void {
  if (socket && socket.connected) {
    socket.emit('send-message', {
      meetingCode,
      message,
      sender,
    });
  }
}

/**
 * Send an emoji reaction to the meeting room
 * @param meetingCode - The meeting code
 * @param reaction - The emoji reaction
 * @param sender - The sender's name
 */
export function sendReaction(meetingCode: string, reaction: string, sender: string): void {
  if (socket && socket.connected) {
    socket.emit('send-reaction', {
      meetingCode,
      reaction,
      sender,
    });
  }
}

/**
 * Disconnect from Socket.io server
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get the current socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Subscribe to socket events
 * @param event - Event name
 * @param callback - Callback function
 */
export function onSocketEvent<T = unknown>(
  event: string,
  callback: (data: T) => void
): void {
  if (socket) {
    socket.on(event, callback);
  }
}

/**
 * Unsubscribe from socket events
 * @param event - Event name
 * @param callback - Optional callback to remove specific listener
 */
export function offSocketEvent<T = unknown>(
  event: string,
  callback?: (data: T) => void
): void {
  if (socket) {
    if (callback) {
      socket.off(event, callback);
    } else {
      socket.off(event);
    }
  }
}

