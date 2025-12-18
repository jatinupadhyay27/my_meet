import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

/**
 * Socket.io server for real-time communication
 * 
 * This module handles:
 * - WebSocket connections for real-time signaling
 * - Meeting room management (join/leave)
 * - Chat messaging
 * - Emoji reactions
 * - Participant presence tracking
 * 
 * NOTE: This will be extended in Day 4 for WebRTC signaling (ICE candidates, offers, answers)
 */

interface JoinMeetingPayload {
  meetingCode: string;
  userName: string;
}

interface SendMessagePayload {
  meetingCode: string;
  message: string;
  sender: string;
}

interface SendReactionPayload {
  meetingCode: string;
  reaction: string;
  sender: string;
}

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.io server and attach to HTTP server
 * Used for WebRTC signaling later
 */
export function initializeSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    /**
     * Event: join-meeting
     * Payload: { meetingCode: string, userName: string }
     * 
     * Behavior:
     * - Socket joins room with meetingCode
     * - Broadcasts "user-joined" to other room members
     */
    socket.on('join-meeting', (payload: JoinMeetingPayload) => {
      const { meetingCode, userName } = payload;

      if (!meetingCode || !userName) {
        socket.emit('error', { message: 'meetingCode and userName are required' });
        return;
      }

      // Join the room (room name is the meetingCode)
      socket.join(meetingCode);
      console.log(`Socket ${socket.id} (${userName}) joined meeting: ${meetingCode}`);

      // Notify others in the room (excluding the sender)
      socket.to(meetingCode).emit('user-joined', {
        userName,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });

      // Confirm to the user that they joined
      socket.emit('joined-meeting', {
        meetingCode,
        userName,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Event: leave-meeting
     * Payload: { meetingCode: string, userName: string }
     * 
     * Behavior:
     * - Remove socket from room
     * - Broadcast "user-left" to room members
     */
    socket.on('leave-meeting', (payload: { meetingCode: string; userName: string }) => {
      const { meetingCode, userName } = payload;

      if (!meetingCode) {
        return;
      }

      // Leave the room
      socket.leave(meetingCode);
      console.log(`Socket ${socket.id} (${userName}) left meeting: ${meetingCode}`);

      // Notify others in the room
      socket.to(meetingCode).emit('user-left', {
        userName,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Event: send-message
     * Payload: { meetingCode: string, message: string, sender: string }
     * 
     * Behavior:
     * - Broadcast chat message to all members in the room
     */
    socket.on('send-message', (payload: SendMessagePayload) => {
      const { meetingCode, message, sender } = payload;

      if (!meetingCode || !message || !sender) {
        socket.emit('error', { message: 'meetingCode, message, and sender are required' });
        return;
      }

      // Broadcast message to all in the room (including sender)
      io?.to(meetingCode).emit('message-received', {
        meetingCode,
        message,
        sender,
        timestamp: new Date().toISOString(),
      });

      console.log(`Message in ${meetingCode} from ${sender}: ${message}`);
    });

    /**
     * Event: send-reaction
     * Payload: { meetingCode: string, reaction: string, sender: string }
     * 
     * Behavior:
     * - Broadcast emoji reaction to all members in the room
     */
    socket.on('send-reaction', (payload: SendReactionPayload) => {
      const { meetingCode, reaction, sender } = payload;

      if (!meetingCode || !reaction || !sender) {
        socket.emit('error', { message: 'meetingCode, reaction, and sender are required' });
        return;
      }

      // Broadcast reaction to all in the room (including sender)
      io?.to(meetingCode).emit('reaction-received', {
        meetingCode,
        reaction,
        sender,
        timestamp: new Date().toISOString(),
      });

      console.log(`Reaction in ${meetingCode} from ${sender}: ${reaction}`);
    });

    /**
     * Event: disconnect
     * 
     * Behavior:
     * - Handle cleanup when socket disconnects
     * - Notify room members if socket was in a room
     */
    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);

      // Get all rooms this socket was in
      const rooms = Array.from(socket.rooms);
      
      // Notify each room that this socket left
      rooms.forEach((room) => {
        // Skip the socket's own room (socket.id)
        if (room !== socket.id) {
          socket.to(room).emit('user-left', {
            socketId: socket.id,
            timestamp: new Date().toISOString(),
          });
        }
      });
    });
  });

  return io;
}

/**
 * Get the Socket.io server instance
 */
export function getSocketIO(): SocketIOServer | null {
  return io;
}
