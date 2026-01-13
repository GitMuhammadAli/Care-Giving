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
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string[]>(); // userId -> socketIds

  constructor(
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        const payload = await this.authService.validateToken(token);
        client.data.userId = payload.userId;
        
        const existing = this.userSockets.get(payload.userId) || [];
        existing.push(client.id);
        this.userSockets.set(payload.userId, existing);
        
        console.log(`Client connected: ${client.id} (user: ${payload.userId})`);
      }
    } catch (error) {
      console.log(`Client connection failed: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    
    if (userId) {
      const existing = this.userSockets.get(userId) || [];
      this.userSockets.set(
        userId,
        existing.filter((id) => id !== client.id),
      );
    }
    
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinFamily')
  handleJoinFamily(@ConnectedSocket() client: Socket, @MessageBody() familyId: string) {
    client.join(`family:${familyId}`);
    console.log(`Client ${client.id} joined family:${familyId}`);
    return { success: true };
  }

  @SubscribeMessage('leaveFamily')
  handleLeaveFamily(@ConnectedSocket() client: Socket, @MessageBody() familyId: string) {
    client.leave(`family:${familyId}`);
    console.log(`Client ${client.id} left family:${familyId}`);
    return { success: true };
  }

  @SubscribeMessage('joinCareRecipient')
  handleJoinCareRecipient(@ConnectedSocket() client: Socket, @MessageBody() careRecipientId: string) {
    client.join(`care-recipient:${careRecipientId}`);
    return { success: true };
  }

  @SubscribeMessage('leaveCareRecipient')
  handleLeaveCareRecipient(@ConnectedSocket() client: Socket, @MessageBody() careRecipientId: string) {
    client.leave(`care-recipient:${careRecipientId}`);
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

  // Emit to specific user (all their devices)
  emitToUser(userId: string, event: string, data: any) {
    const socketIds = this.userSockets.get(userId) || [];
    
    for (const socketId of socketIds) {
      this.server.to(socketId).emit(event, data);
    }
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}

