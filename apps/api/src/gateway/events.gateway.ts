import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/service/auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Allow connections from configured frontend URL or localhost in development
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:4173',
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');

      if (token) {
        const user = await this.authService.validateToken(token);

        if (!user) {
          this.logger.debug(`Client connection failed - invalid token: ${client.id}`);
          client.disconnect();
          return;
        }

        client.data.userId = user.id;

        // Join user-specific room for efficient routing (replaces socket ID tracking)
        client.join(`user:${user.id}`);

        this.logger.debug(`Client connected: ${client.id} (user: ${user.id})`);
      }
    } catch (error) {
      this.logger.debug(`Client connection failed: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId) {
      // Socket.IO automatically removes client from all rooms on disconnect
      this.logger.debug(`Client disconnected: ${client.id} (user: ${userId})`);
    } else {
      this.logger.debug(`Client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('joinFamily')
  async handleJoinFamily(@ConnectedSocket() client: Socket, @MessageBody() familyId: string) {
    const userId = client.data.userId;

    // SECURITY: Verify user is authenticated and is a member of the family
    if (!userId) {
      this.logger.warn(`Unauthorized joinFamily attempt from client ${client.id}`);
      return { success: false, error: 'Unauthorized' };
    }

    const membership = await this.prisma.familyMember.findFirst({
      where: { userId, familyId },
    });

    if (!membership) {
      this.logger.warn(`User ${userId} attempted to join family ${familyId} without membership`);
      return { success: false, error: 'Not a member of this family' };
    }

    client.join(`family:${familyId}`);
    this.logger.debug(`Client ${client.id} (user: ${userId}) joined family:${familyId}`);
    return { success: true };
  }

  @SubscribeMessage('leaveFamily')
  handleLeaveFamily(@ConnectedSocket() client: Socket, @MessageBody() familyId: string) {
    client.leave(`family:${familyId}`);
    this.logger.debug(`Client ${client.id} left family:${familyId}`);
    return { success: true };
  }

  @SubscribeMessage('joinCareRecipient')
  async handleJoinCareRecipient(@ConnectedSocket() client: Socket, @MessageBody() careRecipientId: string) {
    const userId = client.data.userId;

    // SECURITY: Verify user is authenticated and has access to this care recipient
    if (!userId) {
      this.logger.warn(`Unauthorized joinCareRecipient attempt from client ${client.id}`);
      return { success: false, error: 'Unauthorized' };
    }

    // Check if user is a member of the family that has this care recipient
    const careRecipient = await this.prisma.careRecipient.findFirst({
      where: { id: careRecipientId },
      select: { familyId: true },
    });

    if (!careRecipient) {
      return { success: false, error: 'Care recipient not found' };
    }

    const membership = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: careRecipient.familyId },
    });

    if (!membership) {
      this.logger.warn(`User ${userId} attempted to join care-recipient ${careRecipientId} without membership`);
      return { success: false, error: 'Not authorized to access this care recipient' };
    }

    client.join(`care-recipient:${careRecipientId}`);
    this.logger.debug(`Client ${client.id} (user: ${userId}) joined care-recipient:${careRecipientId}`);
    return { success: true };
  }

  @SubscribeMessage('leaveCareRecipient')
  handleLeaveCareRecipient(@ConnectedSocket() client: Socket, @MessageBody() careRecipientId: string) {
    client.leave(`care-recipient:${careRecipientId}`);
    this.logger.debug(`Client ${client.id} left care-recipient:${careRecipientId}`);
    return { success: true };
  }

  // Emit to all family members
  emitToFamily(familyId: string, event: string, data: any) {
    this.server.to(`family:${familyId}`).emit(event, data);
  }

  // Emit to specific care recipient room
  emitToCareRecipient(careRecipientId: string, event: string, data: any) {
    this.server.to(`care-recipient:${careRecipientId}`).emit(event, data);
  }

  // Emit to specific user (all their devices) - uses room-based routing
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}

