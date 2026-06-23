const WebSocket = require("ws");
const { errorLogger, logger } = require("../config/pino-config");
const jwt = require("jsonwebtoken");

class WtfWebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map to store client connections
    this.rooms = new Map(); // Map to store room subscriptions
    this.isInitialized = false;
  }

  // Initialize WebSocket server
  initialize(server) {
    if (this.isInitialized) {
      logger.info("WTF WebSocket server already initialized");
      return;
    }

    try {
      this.wss = new WebSocket.Server({ server });

      this.wss.on("connection", (ws, req) => {
        this.handleConnection(ws, req);
      });

      this.isInitialized = true;
      logger.info("WTF WebSocket server initialized successfully");
    } catch (error) {
      errorLogger.error(
        { error: error.message },
        "Error initializing WTF WebSocket server"
      );
      throw error;
    }
  }

  // Handle new WebSocket connection
  handleConnection(ws, req) {
    const connectionId = this.generateConnectionId();
    const clientInfo = {
      id: connectionId,
      ws: ws,
      userId: null,
      userRole: null,
      rooms: new Set(),
      connectedAt: new Date(),
      ip: req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
    };

    // Store client connection
    this.clients.set(connectionId, clientInfo);

    logger.info(
      {
        connectionId,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
      },
      "New WTF WebSocket connection established"
    );

    // Handle authentication
    this.authenticateConnection(ws, connectionId, req);

    // Set up event handlers
    ws.on("message", (data) => {
      this.handleMessage(connectionId, data);
    });

    ws.on("close", () => {
      this.handleDisconnection(connectionId);
    });

    ws.on("error", (error) => {
      this.handleError(connectionId, error);
    });

    // Send welcome message
    this.sendToClient(connectionId, {
      type: "connection_established",
      data: {
        connectionId,
        message: "WTF WebSocket connection established",
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Authenticate WebSocket connection
  async authenticateConnection(ws, connectionId, req) {
    try {
      // Extract token from query parameters or headers
      const token =
        req.url?.split("token=")[1] ||
        req.headers["authorization"]?.split(" ")[1];

      if (!token) {
        this.sendToClient(connectionId, {
          type: "authentication_error",
          data: {
            message: "Authentication token required",
          },
        });
        // Close unauthenticated connection after brief delay for error message delivery
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(4001, "Authentication token required");
          }
        }, 100);
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const clientInfo = this.clients.get(connectionId);

      if (clientInfo) {
        clientInfo.userId = decoded.id;
        clientInfo.userRole = decoded.role;

        logger.info(
          {
            connectionId,
            userId: clientInfo.userId,
            userRole: clientInfo.userRole,
          },
          "WTF WebSocket connection authenticated"
        );

        // Send authentication success message
        this.sendToClient(connectionId, {
          type: "authentication_success",
          data: {
            userId: clientInfo.userId,
            userRole: clientInfo.userRole,
            message: "Authentication successful",
          },
        });
      }
    } catch (error) {
      errorLogger.error(
        { connectionId, error: error.message },
        "WTF WebSocket authentication failed"
      );

      this.sendToClient(connectionId, {
        type: "authentication_error",
        data: {
          message: "Invalid authentication token",
        },
      });
      // Close unauthenticated connection after brief delay for error message delivery
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(4002, "Invalid authentication token");
        }
      }, 100);
    }
  }

  // Handle incoming messages
  handleMessage(connectionId, data) {
    try {
      const message = JSON.parse(data.toString());
      const clientInfo = this.clients.get(connectionId);

      if (!clientInfo) {
        return;
      }

      logger.info(
        {
          connectionId,
          userId: clientInfo.userId,
          messageType: message.type,
        },
        "WTF WebSocket message received"
      );

      switch (message.type) {
        case "subscribe":
          this.handleSubscribe(connectionId, message.data);
          break;

        case "unsubscribe":
          this.handleUnsubscribe(connectionId, message.data);
          break;

        case "ping":
          this.sendToClient(connectionId, {
            type: "pong",
            data: {
              timestamp: new Date().toISOString(),
            },
          });
          break;

        default:
          this.sendToClient(connectionId, {
            type: "error",
            data: {
              message: "Unknown message type",
            },
          });
      }
    } catch (error) {
      errorLogger.error(
        { connectionId, error: error.message },
        "Error handling WTF WebSocket message"
      );

      this.sendToClient(connectionId, {
        type: "error",
        data: {
          message: "Invalid message format",
        },
      });
    }
  }

  // Handle subscription to rooms
  handleSubscribe(connectionId, data) {
    const { room } = data;
    const clientInfo = this.clients.get(connectionId);

    if (!clientInfo) {
      return;
    }

    // Add client to room
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room).add(connectionId);
    clientInfo.rooms.add(room);

    logger.info(
      {
        connectionId,
        userId: clientInfo.userId,
        room,
      },
      "WTF WebSocket client subscribed to room"
    );

    this.sendToClient(connectionId, {
      type: "subscription_success",
      data: {
        room,
        message: `Subscribed to ${room}`,
      },
    });
  }

  // Handle unsubscription from rooms
  handleUnsubscribe(connectionId, data) {
    const { room } = data;
    const clientInfo = this.clients.get(connectionId);

    if (!clientInfo) {
      return;
    }

    // Remove client from room
    if (this.rooms.has(room)) {
      this.rooms.get(room).delete(connectionId);

      // Remove empty room
      if (this.rooms.get(room).size === 0) {
        this.rooms.delete(room);
      }
    }
    clientInfo.rooms.delete(room);

    logger.info(
      {
        connectionId,
        userId: clientInfo.userId,
        room,
      },
      "WTF WebSocket client unsubscribed from room"
    );

    this.sendToClient(connectionId, {
      type: "unsubscription_success",
      data: {
        room,
        message: `Unsubscribed from ${room}`,
      },
    });
  }

  // Handle client disconnection
  handleDisconnection(connectionId) {
    const clientInfo = this.clients.get(connectionId);

    if (clientInfo) {
      // Remove client from all rooms
      for (const room of clientInfo.rooms) {
        if (this.rooms.has(room)) {
          this.rooms.get(room).delete(connectionId);

          // Remove empty room
          if (this.rooms.get(room).size === 0) {
            this.rooms.delete(room);
          }
        }
      }

      logger.info(
        {
          connectionId,
          userId: clientInfo.userId,
          duration: Date.now() - clientInfo.connectedAt.getTime(),
        },
        "WTF WebSocket client disconnected"
      );
    }

    this.clients.delete(connectionId);
  }

  // Handle WebSocket errors
  handleError(connectionId, error) {
    errorLogger.error(
      { connectionId, error: error.message },
      "WTF WebSocket error"
    );
    this.handleDisconnection(connectionId);
  }

  // Send message to specific client
  sendToClient(connectionId, message) {
    const clientInfo = this.clients.get(connectionId);

    if (clientInfo && clientInfo.ws.readyState === WebSocket.OPEN) {
      try {
        clientInfo.ws.send(JSON.stringify(message));
      } catch (error) {
        errorLogger.error(
          { connectionId, error: error.message },
          "Error sending message to WTF WebSocket client"
        );
        this.handleDisconnection(connectionId);
      }
    }
  }

  // Broadcast message to all clients in a room
  broadcastToRoom(room, message) {
    if (!this.rooms.has(room)) {
      return;
    }

    const clientsInRoom = this.rooms.get(room);
    let sentCount = 0;

    for (const connectionId of clientsInRoom) {
      const clientInfo = this.clients.get(connectionId);

      if (clientInfo && clientInfo.ws.readyState === WebSocket.OPEN) {
        try {
          clientInfo.ws.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          errorLogger.error(
            { connectionId, error: error.message },
            "Error broadcasting to WTF WebSocket client"
          );
          this.handleDisconnection(connectionId);
        }
      }
    }

    logger.info(
      {
        room,
        messageType: message.type,
        sentCount,
        totalClients: clientsInRoom.size,
      },
      "WTF WebSocket message broadcasted to room"
    );
  }

  // Broadcast message to all connected clients
  broadcastToAll(message) {
    let sentCount = 0;

    for (const [connectionId, clientInfo] of this.clients) {
      if (clientInfo.ws.readyState === WebSocket.OPEN) {
        try {
          clientInfo.ws.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          errorLogger.error(
            { connectionId, error: error.message },
            "Error broadcasting to WTF WebSocket client"
          );
          this.handleDisconnection(connectionId);
        }
      }
    }

    logger.info(
      {
        messageType: message.type,
        sentCount,
        totalClients: this.clients.size,
      },
      "WTF WebSocket message broadcasted to all clients"
    );
  }

  // Send message to specific user
  sendToUser(userId, message) {
    let sentCount = 0;

    for (const [connectionId, clientInfo] of this.clients) {
      if (
        clientInfo.userId === userId &&
        clientInfo.ws.readyState === WebSocket.OPEN
      ) {
        try {
          clientInfo.ws.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          errorLogger.error(
            { connectionId, error: error.message },
            "Error sending message to WTF WebSocket user"
          );
          this.handleDisconnection(connectionId);
        }
      }
    }

    logger.info(
      {
        userId,
        messageType: message.type,
        sentCount,
      },
      "WTF WebSocket message sent to user"
    );
  }

  // WTF-specific event handlers
  handlePinCreated(pinData) {
    const message = {
      type: "pin_created",
      data: {
        pin: pinData,
        timestamp: new Date().toISOString(),
      },
    };

    // Broadcast to all clients in the general room
    this.broadcastToRoom("wtf_general", message);

    // Send to admin users
    for (const [connectionId, clientInfo] of this.clients) {
      if (
        clientInfo.userRole === "admin" &&
        clientInfo.ws.readyState === WebSocket.OPEN
      ) {
        this.sendToClient(connectionId, message);
      }
    }
  }

  handlePinLiked(pinId, userId, likeData) {
    const message = {
      type: "pin_liked",
      data: {
        pinId,
        userId,
        likeData,
        timestamp: new Date().toISOString(),
      },
    };

    // Broadcast to pin-specific room
    this.broadcastToRoom(`wtf_pin_${pinId}`, message);

    // Send to pin author
    this.sendToUser(likeData.author, message);
  }

  handlePinSeen(pinId, userId, viewData) {
    const message = {
      type: "pin_seen",
      data: {
        pinId,
        userId,
        viewData,
        timestamp: new Date().toISOString(),
      },
    };

    // Broadcast to pin-specific room
    this.broadcastToRoom(`wtf_pin_${pinId}`, message);
  }

  handleSubmissionCreated(submissionData) {
    const message = {
      type: "submission_created",
      data: {
        submission: submissionData,
        timestamp: new Date().toISOString(),
      },
    };

    // Send to admin users for review
    for (const [connectionId, clientInfo] of this.clients) {
      if (
        clientInfo.userRole === "admin" &&
        clientInfo.ws.readyState === WebSocket.OPEN
      ) {
        this.sendToClient(connectionId, message);
      }
    }
  }

  handleSubmissionReviewed(submissionId, reviewData) {
    const message = {
      type: "submission_reviewed",
      data: {
        submissionId,
        reviewData,
        timestamp: new Date().toISOString(),
      },
    };

    // Send to submission author
    this.sendToUser(reviewData.studentId, message);

    // Send to admin users
    for (const [connectionId, clientInfo] of this.clients) {
      if (
        clientInfo.userRole === "admin" &&
        clientInfo.ws.readyState === WebSocket.OPEN
      ) {
        this.sendToClient(connectionId, message);
      }
    }
  }

  // Get connection statistics
  getConnectionStats() {
    const stats = {
      totalConnections: this.clients.size,
      totalRooms: this.rooms.size,
      rooms: {},
      userStats: {},
    };

    // Room statistics
    for (const [room, clients] of this.rooms) {
      stats.rooms[room] = clients.size;
    }

    // User statistics
    for (const [connectionId, clientInfo] of this.clients) {
      if (clientInfo.userId) {
        if (!stats.userStats[clientInfo.userId]) {
          stats.userStats[clientInfo.userId] = {
            connections: 0,
            role: clientInfo.userRole,
          };
        }
        stats.userStats[clientInfo.userId].connections++;
      }
    }

    return stats;
  }

  // Generate unique connection ID
  generateConnectionId() {
    return `wtf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Close all connections
  closeAllConnections() {
    for (const [connectionId, clientInfo] of this.clients) {
      if (clientInfo.ws.readyState === WebSocket.OPEN) {
        clientInfo.ws.close();
      }
    }

    this.clients.clear();
    this.rooms.clear();

    logger.info("All WTF WebSocket connections closed");
  }
}

// Create singleton instance
const wtfWebSocketService = new WtfWebSocketService();

module.exports = wtfWebSocketService;
