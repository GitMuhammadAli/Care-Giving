import { io, Socket } from 'socket.io-client';

type EventCallback = (data: any) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;

      // Connect to the /carecircle namespace
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const wsUrl = apiUrl.replace('/api/v1', '');

      this.socket = io(`${wsUrl}/carecircle`, {
        withCredentials: true, // Send cookies with connection
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        console.log('🔌 WebSocket connected to /carecircle');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔌 WebSocket connection error:', error.message);
        this.isConnecting = false;
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Max reconnection attempts reached'));
        }
      });

      // Re-register all listeners on reconnect
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((callback) => {
          this.socket?.on(event, callback);
        });
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  joinFamily(familyId: string, userId: string): void {
    this.socket?.emit('join_family', { familyId, userId });
    console.log(`👨‍👩‍👧 Joining family room: ${familyId}`);
  }

  leaveFamily(familyId: string): void {
    this.socket?.emit('leave_family', { familyId });
    console.log(`👋 Leaving family room: ${familyId}`);
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    this.socket?.on(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
    this.socket?.off(event, callback);
  }

  emit(event: string, data: any): void {
    this.socket?.emit(event, data);
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Singleton instance
export const wsClient = new WebSocketClient();

// Event types matching backend - MUST match what backend emits!
export const WS_EVENTS = {
  // Incoming events from backend (backend uses underscores)
  EMERGENCY_ALERT: 'emergency_alert',
  EMERGENCY_RESOLVED: 'emergency_resolved',
  MEDICATION_LOGGED: 'medication_logged',
  MEDICATION_REMINDER: 'medication_reminder',
  APPOINTMENT_CREATED: 'appointment_created',
  APPOINTMENT_UPDATED: 'appointment_updated',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  TIMELINE_ENTRY: 'timeline_entry',
  SHIFT_UPDATE: 'shift_update',
  SHIFT_CHECKED_IN: 'shift_checked_in',
  SHIFT_CHECKED_OUT: 'shift_checked_out',
  FAMILY_MEMBER_JOINED: 'family_member_joined',
  NOTIFICATION: 'notification',

  // Broadcast events
  WS_BROADCAST: 'ws_broadcast',
  EMERGENCY_NOTIFICATION: 'emergency_notification',

  // Outgoing events
  JOIN_FAMILY: 'join_family',
  LEAVE_FAMILY: 'leave_family',
} as const;
