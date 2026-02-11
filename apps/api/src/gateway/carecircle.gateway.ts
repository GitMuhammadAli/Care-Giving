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
import { Inject, forwardRef, Logger } from '@nestjs/common';
import { optionalString, isDevelopment } from '../config/env.helpers';
import { AuthService } from '../auth/service/auth.service';
import { PrismaService } from '../prisma/prisma.service';

interface BroadcastPayload {
  event: string;
  data: unknown;
  rooms: string[];
}

// Get frontend URL at module load time (after dotenv is loaded)
const frontendUrl = optionalString('FRONTEND_URL', 'http://localhost:4173');
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

  constructor(
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  /**
   * SECURITY: Authenticate every WebSocket connection via JWT.
   * Unauthenticated clients are immediately disconnected.
   */
  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.debug(
          `Client ${client.id} rejected - no auth token provided`,
        );
        client.disconnect();
        return;
      }

      const user = await this.authService.validateToken(token);

      if (!user) {
        this.logger.debug(
          `Client ${client.id} rejected - invalid token`,
        );
        client.disconnect();
        return;
      }

      // Store authenticated user data on the socket
      client.data.userId = user.id;
      client.data.email = user.email;
      client.data.systemRole = user.systemRole;

      // Join user-specific room
      client.join(`user:${user.id}`);

      this.logger.log(`Client connected: ${client.id} (user: ${user.id})`);
    } catch (error) {
      this.logger.debug(`Client ${client.id} connection failed: ${error}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove from user map
    if (userId) {
      const sockets = this.userSocketMap.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSocketMap.delete(userId);
        }
      }
    }
  }

  @SubscribeMessage('join_family')
  async handleJoinFamily(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { familyId: string },
  ) {
    const userId = client.data?.userId;

    // SECURITY: Require authentication
    if (!userId) {
      this.logger.warn(`Unauthorized join_family attempt from ${client.id}`);
      return { success: false, error: 'Unauthorized' };
    }

    // SECURITY: Verify family membership server-side
    const membership = await this.prisma.familyMember.findFirst({
      where: { userId, familyId: data.familyId, isActive: true },
    });

    if (!membership) {
      this.logger.warn(
        `User ${userId} attempted to join family ${data.familyId} without membership`,
      );
      return { success: false, error: 'Not a member of this family' };
    }

    client.join(`family:${data.familyId}`);

    // Track user's sockets
    if (!this.userSocketMap.has(userId)) {
      this.userSocketMap.set(userId, new Set());
    }
    this.userSocketMap.get(userId)?.add(client.id);

    this.logger.log(`User ${userId} joined family ${data.familyId}`);
    return { success: true };
  }

  @SubscribeMessage('leave_family')
  handleLeaveFamily(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { familyId: string },
  ) {
    client.leave(`family:${data.familyId}`);
    this.logger.log(`Client left family ${data.familyId}`);
    return { success: true };
  }

  /**
   * SECURITY: Admin monitoring room - validates admin role SERVER-SIDE.
   * Never trust client-provided isAdmin flag.
   */
  @SubscribeMessage('join_admin_monitoring')
  async handleJoinAdminMonitoring(
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.userId;
    const systemRole = client.data?.systemRole;

    // SECURITY: Require authentication
    if (!userId) {
      this.logger.warn(
        `Unauthorized join_admin_monitoring attempt from ${client.id}`,
      );
      return { success: false, error: 'Unauthorized' };
    }

    // SECURITY: Validate admin role server-side (never trust client)
    if (systemRole !== 'ADMIN' && systemRole !== 'SUPER_ADMIN') {
      // Double-check from database in case role changed since connection
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { systemRole: true },
      });

      if (
        !user ||
        (user.systemRole !== 'ADMIN' && user.systemRole !== 'SUPER_ADMIN')
      ) {
        this.logger.warn(
          `Non-admin user ${userId} attempted to join admin monitoring`,
        );
        return { success: false, error: 'Admin access required' };
      }
    }

    client.join('admin:monitoring');
    this.logger.log(`Admin ${userId} joined monitoring room`);
    // Send initial stats
    this.emitAdminStats();
    return { success: true };
  }

  @SubscribeMessage('leave_admin_monitoring')
  handleLeaveAdminMonitoring(@ConnectedSocket() client: Socket) {
    client.leave('admin:monitoring');
    this.logger.log('Client left admin monitoring room');
    return { success: true };
  }

  // Emit realtime stats to admin dashboard
  private emitAdminStats() {
    const stats = {
      connectedClients: this.server?.engine?.clientsCount || 0,
      activeUsers: this.userSocketMap.size,
      timestamp: new Date().toISOString(),
    };
    this.server.to('admin:monitoring').emit('admin_stats', stats);
  }

  // Emit admin stats periodically - called by cron or interval
  emitRealtimeStats(stats: any) {
    this.server.to('admin:monitoring').emit('admin_realtime', stats);
  }

  // Emit when new log entry is created
  emitNewLogEntry(entry: any) {
    this.server.to('admin:monitoring').emit('admin_new_log', entry);
  }

  // Emit when auth event happens
  emitAuthEvent(event: any) {
    this.server.to('admin:monitoring').emit('admin_auth_event', event);
  }

  // Emit when email is sent/fails
  emitEmailEvent(event: any) {
    this.server.to('admin:monitoring').emit('admin_email_event', event);
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
  // ============================================================================

  @OnEvent('ws.broadcast')
  handleBroadcast(payload: BroadcastPayload) {
    const { event, data, rooms } = payload;
    this.logger.debug(`Broadcasting event ${event} to rooms: ${rooms.join(', ')}`);
    for (const room of rooms) {
      this.server.to(room).emit(event, data);
    }
  }

  @OnEvent('ws.emergency')
  handleEmergencyBroadcast(payload: BroadcastPayload) {
    const { event, data, rooms } = payload;
    this.logger.warn(`EMERGENCY BROADCAST: ${event} to rooms: ${rooms.join(', ')}`);
    for (const room of rooms) {
      this.server.to(room).volatile.emit(event, data);
    }
    this.server.emit('emergency_notification', {
      event,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // ADMIN ACTION EVENT HANDLERS
  // ============================================================================

  @OnEvent('family.member.removed')
  handleFamilyMemberRemoved(payload: any) {
    if (payload.familyId) {
      this.server.to(`family:${payload.familyId}`).emit('family_member_removed', {
        memberId: payload.memberId,
        memberName: payload.memberName,
        removedBy: payload.removedByName,
      });
    }
    if (payload.removedUserId) {
      this.sendToUser(payload.removedUserId, 'you_were_removed', {
        familyId: payload.familyId,
        familyName: payload.familyName,
        removedBy: payload.removedByName,
      });
    }
  }

  @OnEvent('family.member.role_updated')
  handleFamilyMemberRoleUpdated(payload: any) {
    if (payload.familyId) {
      this.server.to(`family:${payload.familyId}`).emit('family_member_role_updated', {
        memberId: payload.memberId,
        memberName: payload.memberName,
        oldRole: payload.oldRole,
        newRole: payload.newRole,
        updatedBy: payload.updatedByName,
      });
    }
    if (payload.memberUserId) {
      this.sendToUser(payload.memberUserId, 'your_role_changed', {
        familyId: payload.familyId,
        familyName: payload.familyName,
        newRole: payload.newRole,
        changedBy: payload.updatedByName,
      });
    }
  }

  @OnEvent('family.deleted')
  handleFamilyDeleted(payload: any) {
    if (payload.familyId) {
      this.server.to(`family:${payload.familyId}`).emit('family_deleted', {
        familyId: payload.familyId,
        familyName: payload.familyName,
        deletedBy: payload.deletedByName,
      });
    }
  }

  @OnEvent('care_recipient.deleted')
  handleCareRecipientDeleted(payload: any) {
    if (payload.familyId) {
      this.server.to(`family:${payload.familyId}`).emit('care_recipient_deleted', {
        careRecipientId: payload.careRecipientId,
        careRecipientName: payload.careRecipientName,
        deletedBy: payload.deletedByName,
      });
    }
  }

  @OnEvent('care_recipient.updated')
  handleCareRecipientUpdated(payload: any) {
    if (payload.familyId) {
      this.server.to(`family:${payload.familyId}`).emit('care_recipient_updated', {
        careRecipientId: payload.careRecipientId,
        careRecipientName: payload.careRecipientName,
        changes: payload.changes,
        updatedBy: payload.updatedByName,
      });
    }
  }

  @OnEvent('medication.deleted')
  handleMedicationDeleted(payload: any) {
    if (payload.familyId) {
      this.server.to(`family:${payload.familyId}`).emit('medication_deleted', {
        medicationId: payload.medicationId,
        medicationName: payload.medicationName,
        careRecipientName: payload.careRecipientName,
        deletedBy: payload.deletedByName,
      });
    }
  }

  @OnEvent('appointment.deleted')
  handleAppointmentDeleted(payload: any) {
    if (payload.familyId) {
      this.server.to(`family:${payload.familyId}`).emit('appointment_deleted', {
        appointmentId: payload.appointmentId,
        appointmentTitle: payload.appointmentTitle,
        careRecipientName: payload.careRecipientName,
        deletedBy: payload.deletedByName,
      });
    }
  }

  // ============================================================================
  // DOCUMENT EVENT HANDLERS
  // ============================================================================

  @OnEvent('document.uploaded')
  handleDocumentUploaded(payload: { document: any; uploadedBy: any; familyId: string }) {
    if (payload.familyId) {
      this.server.to(`family:${payload.familyId}`).emit('document_uploaded', {
        documentId: payload.document.id,
        documentName: payload.document.name,
        documentType: payload.document.type,
        uploadedBy: payload.uploadedBy?.fullName || 'Unknown',
        uploadedAt: payload.document.createdAt,
      });
    }
  }

  @OnEvent('document.deleted')
  handleDocumentDeleted(payload: { documentId: string; documentName: string; documentType: string; familyId: string; deletedBy: any }) {
    if (payload.familyId) {
      this.server.to(`family:${payload.familyId}`).emit('document_deleted', {
        documentId: payload.documentId,
        documentName: payload.documentName,
        documentType: payload.documentType,
        deletedBy: payload.deletedBy?.fullName || 'Admin',
      });
    }
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
