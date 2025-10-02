/**
 * WebSocket Service for GCT Token Platform
 * Handles real-time communication and notifications
 */

const { Server } = require('socket.io');
const logger = require('../utils/logger');

class WebSocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    this.connectedClients = new Map();
    this.rooms = new Map();
    
    this.initialize();
  }

  initialize() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    // Set up periodic broadcasts
    this.setupPeriodicBroadcasts();
    
    logger.info('WebSocket service initialized');
  }

  handleConnection(socket) {
    const clientId = socket.id;
    const clientInfo = {
      id: clientId,
      socket: socket,
      connectedAt: new Date(),
      rooms: new Set(),
      isAuthenticated: false,
      userId: null,
      isAdmin: false
    };

    this.connectedClients.set(clientId, clientInfo);

    logger.info('Client connected', { clientId });

    // Handle authentication
    socket.on('authenticate', (data) => {
      this.handleAuthentication(socket, data);
    });

    // Handle room joining
    socket.on('join_room', (room) => {
      this.handleJoinRoom(socket, room);
    });

    // Handle room leaving
    socket.on('leave_room', (room) => {
      this.handleLeaveRoom(socket, room);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Handle custom events
    socket.on('subscribe', (event) => {
      this.handleSubscription(socket, event);
    });

    socket.on('unsubscribe', (event) => {
      this.handleUnsubscription(socket, event);
    });
  }

  handleAuthentication(socket, data) {
    const client = this.connectedClients.get(socket.id);
    if (!client) return;

    try {
      // Verify JWT token
      const jwt = require('jsonwebtoken');
      const token = data.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      
      client.isAuthenticated = true;
      client.userId = decoded.id;
      client.isAdmin = decoded.isAdmin || false;

      // Join user-specific room
      socket.join(`user_${decoded.id}`);
      
      // Join admin room if admin
      if (client.isAdmin) {
        socket.join('admin');
      }

      socket.emit('authenticated', {
        success: true,
        userId: decoded.id,
        isAdmin: client.isAdmin
      });

      logger.info('Client authenticated', {
        clientId: socket.id,
        userId: decoded.id,
        isAdmin: client.isAdmin
      });

    } catch (error) {
      logger.error('Authentication failed', {
        clientId: socket.id,
        error: error.message
      });
      
      socket.emit('auth_error', {
        success: false,
        error: 'Invalid token'
      });
    }
  }

  handleJoinRoom(socket, room) {
    const client = this.connectedClients.get(socket.id);
    if (!client) return;

    socket.join(room);
    client.rooms.add(room);

    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room).add(socket.id);

    logger.info('Client joined room', {
      clientId: socket.id,
      room: room
    });
  }

  handleLeaveRoom(socket, room) {
    const client = this.connectedClients.get(socket.id);
    if (!client) return;

    socket.leave(room);
    client.rooms.delete(room);

    if (this.rooms.has(room)) {
      this.rooms.get(room).delete(socket.id);
      if (this.rooms.get(room).size === 0) {
        this.rooms.delete(room);
      }
    }

    logger.info('Client left room', {
      clientId: socket.id,
      room: room
    });
  }

  handleDisconnection(socket) {
    const client = this.connectedClients.get(socket.id);
    if (!client) return;

    // Remove from all rooms
    client.rooms.forEach(room => {
      if (this.rooms.has(room)) {
        this.rooms.get(room).delete(socket.id);
        if (this.rooms.get(room).size === 0) {
          this.rooms.delete(room);
        }
      }
    });

    this.connectedClients.delete(socket.id);

    logger.info('Client disconnected', {
      clientId: socket.id,
      userId: client.userId
    });
  }

  handleSubscription(socket, event) {
    const client = this.connectedClients.get(socket.id);
    if (!client) return;

    // Join event-specific room
    const room = `event_${event}`;
    socket.join(room);
    client.rooms.add(room);

    logger.info('Client subscribed to event', {
      clientId: socket.id,
      event: event
    });
  }

  handleUnsubscription(socket, event) {
    const client = this.connectedClients.get(socket.id);
    if (!client) return;

    // Leave event-specific room
    const room = `event_${event}`;
    socket.leave(room);
    client.rooms.delete(room);

    logger.info('Client unsubscribed from event', {
      clientId: socket.id,
      event: event
    });
  }

  // Broadcast methods
  broadcastToAll(type, data) {
    this.io.emit(type, data);
    logger.info('Broadcasted to all clients', { type, data });
  }

  broadcastToRoom(room, type, data) {
    this.io.to(room).emit(type, data);
    logger.info('Broadcasted to room', { room, type, data });
  }

  broadcastToUser(userId, type, data) {
    this.io.to(`user_${userId}`).emit(type, data);
    logger.info('Broadcasted to user', { userId, type, data });
  }

  broadcastToAdmins(type, data) {
    this.io.to('admin').emit(type, data);
    logger.info('Broadcasted to admins', { type, data });
  }

  // Specific notification methods
  sendPriceUpdate(priceData) {
    this.broadcastToAll('price_update', {
      type: 'price_update',
      payload: priceData,
      timestamp: new Date().toISOString()
    });
  }

  sendClaimNotification(claimData) {
    const notification = {
      type: 'claim',
      title: 'Claim Update',
      message: `Claim ${claimData.status}: ${claimData.amount} GCT`,
      data: claimData
    };

    // Send to user
    if (claimData.userId) {
      this.broadcastToUser(claimData.userId, 'notification', notification);
    }

    // Send to admins
    this.broadcastToAdmins('notification', notification);
  }

  sendUserNotification(userId, notification) {
    this.broadcastToUser(userId, 'notification', {
      type: 'user',
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  sendSystemNotification(notification) {
    this.broadcastToAll('notification', {
      type: 'system',
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Setup periodic broadcasts
  setupPeriodicBroadcasts() {
    // Price updates every 30 seconds
    setInterval(async () => {
      try {
        const priceService = require('./priceService');
        const priceData = await priceService.getTokenPrice();
        this.sendPriceUpdate(priceData);
      } catch (error) {
        logger.error('Failed to broadcast price update', error);
      }
    }, 30000);

    // System health check every 5 minutes
    setInterval(() => {
      const healthData = {
        connectedClients: this.connectedClients.size,
        activeRooms: this.rooms.size,
        uptime: process.uptime()
      };
      
      this.broadcastToAdmins('system_health', healthData);
    }, 300000);
  }

  // Get connection statistics
  getStats() {
    return {
      connectedClients: this.connectedClients.size,
      activeRooms: this.rooms.size,
      authenticatedClients: Array.from(this.connectedClients.values())
        .filter(client => client.isAuthenticated).length,
      adminClients: Array.from(this.connectedClients.values())
        .filter(client => client.isAdmin).length
    };
  }

  // Get connected clients
  getConnectedClients() {
    return Array.from(this.connectedClients.values()).map(client => ({
      id: client.id,
      userId: client.userId,
      isAdmin: client.isAdmin,
      connectedAt: client.connectedAt,
      rooms: Array.from(client.rooms)
    }));
  }

  // Force disconnect client
  disconnectClient(clientId) {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.socket.disconnect();
    }
  }

  // Force disconnect all clients
  disconnectAll() {
    this.connectedClients.forEach(client => {
      client.socket.disconnect();
    });
  }
}

module.exports = WebSocketService;