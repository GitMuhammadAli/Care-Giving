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
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { optionalString, isDevelopment } from '../config/env.helpers';

interface BroadcastPayload {
  event: string;
  data: unknown;
  rooms: string[];
}

// Get frontend URL at module load time (after dotenv is loaded)
const frontendUrl = optionalString('FRONTEND_URL', 'http://localhost:3000');
const corsOrigin = isDevelopment() ? true : frontendUrl;

@WebSocketGateway({
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
  namespace: 'carecircle',
})
export class CareCircleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CareCircleGateway.name);
  private userSocketMap = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove from user map
    this.userSocketMap.forEach((sockets, userId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSocketMap.delete(userId);
      }
    });
  }

  @SubscribeMessage('join_family')
  handleJoinFamily(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { familyId: string; userId: string },
  ) {
    client.join(`family:${data.familyId}`);
    
    // Track user's sockets
    if (!this.userSocketMap.has(data.userId)) {
      this.userSocketMap.set(data.userId, new Set());
    }
    this.userSocketMap.get(data.userId)?.add(client.id);
    
    this.logger.log(`User ${data.userId} joined family ${data.familyId}`);
  }

  @SubscribeMessage('leave_family')
  handleLeaveFamily(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { familyId: string },
  ) {
    client.leave(`family:${data.familyId}`);
    this.logger.log(`Client left family ${data.familyId}`);
  }

  // Event handlers for real-time updates
  @OnEvent('medication.logged')
  handleMedicationLogged(payload: { log: any; medication: any; loggedBy: any }) {
    const careRecipientId = payload.medication.careRecipientId;
    this.server.to(`family:${careRecipientId}`).emit('medication_logged', {
      medicationId: payload.medication.id,
      medicationName: payload.medication.name,
      status: payload.log.status,
      loggedBy: payload.loggedBy.name,
      time: new Date(),
    });
  }

  @OnEvent('appointment.created')
  handleAppointmentCreated(appointment: any) {
    this.server.to(`family:${appointment.careRecipientId}`).emit('appointment_created', appointment);
  }

  @OnEvent('appointment.updated')
  handleAppointmentUpdated(appointment: any) {
    this.server.to(`family:${appointment.careRecipientId}`).emit('appointment_updated', appointment);
  }

  @OnEvent('emergency.alert.created')
  handleEmergencyAlert(payload: { alert: any; familyId: string; notifiedUserIds: string[] }) {
    // Emergency alerts go to everyone in the family immediately
    this.server.to(`family:${payload.familyId}`).emit('emergency_alert', {
      id: payload.alert.id,
      type: payload.alert.type,
      description: payload.alert.description,
      careRecipientId: payload.alert.careRecipientId,
      triggeredBy: payload.alert.triggeredById,
      createdAt: payload.alert.createdAt,
    });
  }

  @OnEvent('emergency.alert.resolved')
  handleEmergencyResolved(payload: { alert: any; resolvedBy: any }) {
    this.server.to(`family:${payload.alert.familyId}`).emit('emergency_resolved', {
      id: payload.alert.id,
      resolvedBy: payload.resolvedBy.name,
      resolvedAt: payload.alert.resolvedAt,
    });
  }

  @OnEvent('shift.checkedIn')
  handleShiftCheckedIn(payload: { shift: any; caregiver: any }) {
    this.server.to(`family:${payload.shift.careRecipientId}`).emit('shift_update', {
      type: 'check_in',
      shiftId: payload.shift.id,
      caregiver: {
        id: payload.caregiver.id,
        name: payload.caregiver.name,
      },
      time: payload.shift.actualStartTime,
    });
  }

  @OnEvent('shift.checkedOut')
  handleShiftCheckedOut(payload: { shift: any; caregiver: any }) {
    this.server.to(`family:${payload.shift.careRecipientId}`).emit('shift_update', {
      type: 'check_out',
      shiftId: payload.shift.id,
      caregiver: {
        id: payload.caregiver.id,
        name: payload.caregiver.name,
      },
      time: payload.shift.actualEndTime,
      handoffNotes: payload.shift.handoffNotes,
    });
  }

  @OnEvent('timeline.entry.created')
  handleTimelineEntry(payload: { entry: any; createdBy: any }) {
    this.server.to(`family:${payload.entry.careRecipientId}`).emit('timeline_entry', {
      id: payload.entry.id,
      type: payload.entry.type,
      title: payload.entry.title,
      createdBy: payload.createdBy.name,
      createdAt: payload.entry.createdAt,
    });
  }

  // ============================================================================
  // RABBITMQ EVENT HANDLERS
  // These events come from the WebSocketConsumer which listens to RabbitMQ
  // ============================================================================

  /**
   * Handle broadcast events from RabbitMQ (via WebSocketConsumer)
   * This is the main handler for all domain events that need WebSocket broadcasting
   */
  @OnEvent('ws.broadcast')
  handleBroadcast(payload: BroadcastPayload) {
    const { event, data, rooms } = payload;
    
    this.logger.debug(`Broadcasting event ${event} to rooms: ${rooms.join(', ')}`);
    
    for (const room of rooms) {
      this.server.to(room).emit(event, data);
    }
  }

  /**
   * Handle emergency events from RabbitMQ (via WebSocketConsumer)
   * These are high-priority and need immediate delivery
   */
  @OnEvent('ws.emergency')
  handleEmergencyBroadcast(payload: BroadcastPayload) {
    const { event, data, rooms } = payload;
    
    this.logger.warn(`🚨 EMERGENCY BROADCAST: ${event} to rooms: ${rooms.join(', ')}`);
    
    // Emergency events are broadcast with volatile (fire-and-forget for performance)
    // but also with acknowledgment request for critical updates
    for (const room of rooms) {
      this.server.to(room).volatile.emit(event, data);
    }
    
    // Also emit to all connected clients as a fallback
    this.server.emit('emergency_notification', {
      event,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // Send notification to specific user
  sendToUser(userId: string, event: string, data: any) {
    const sockets = this.userSocketMap.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }

  // Send notification to family
  sendToFamily(familyId: string, event: string, data: any) {
    this.server.to(`family:${familyId}`).emit(event, data);
  }
}

