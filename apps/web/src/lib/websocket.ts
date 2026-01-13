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

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

      this.socket = io(wsUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        console.log('🔌 WebSocket connected');
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

      // Re-register all listeners
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

  joinFamily(familyId: string): void {
    this.socket?.emit('join_family', { familyId });
  }

  leaveFamily(familyId: string): void {
    this.socket?.emit('leave_family', { familyId });
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

// Event types
export const WS_EVENTS = {
  // Incoming events
  EMERGENCY_ALERT: 'emergency_alert',
  MEDICATION_LOGGED: 'medication_logged',
  MEDICATION_REMINDER: 'medication_reminder',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  TIMELINE_ENTRY: 'timeline_entry',
  SHIFT_UPDATE: 'shift_update',
  FAMILY_MEMBER_JOINED: 'family_member_joined',
  NOTIFICATION: 'notification',

  // Outgoing events
  JOIN_FAMILY: 'join_family',
  LEAVE_FAMILY: 'leave_family',
} as const;

