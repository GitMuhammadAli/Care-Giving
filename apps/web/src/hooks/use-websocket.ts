'use client';

import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient, WS_EVENTS } from '@/lib/websocket';
import { useAuth } from './use-auth';
import toast from 'react-hot-toast';

export function useWebSocket(familyId?: string) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  // Connect to WebSocket
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const connect = async () => {
      try {
        // Use a dummy token since we're using withCredentials (cookies)
        await wsClient.connect('authenticated');
        setIsConnected(true);

        // Join family room if familyId provided
        if (familyId) {
          wsClient.joinFamily(familyId, user.id);
        }

        // Join all user's families
        if (user.families && user.families.length > 0) {
          user.families.forEach((family: any) => {
            const fId = family.familyId || family.id;
            wsClient.joinFamily(fId, user.id);
          });
        }
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (familyId) {
        wsClient.leaveFamily(familyId);
      }
    };
  }, [isAuthenticated, user, familyId]);

  // Set up event listeners
  useEffect(() => {
    if (!isConnected) return;

    // ============================================================================
    // EMERGENCY EVENTS
    // ============================================================================

    const handleEmergencyAlert = (data: any) => {
      console.warn('🚨 EMERGENCY ALERT:', data);
      toast.error(`🚨 EMERGENCY: ${data.type}${data.description ? ` - ${data.description}` : ''}`, {
        duration: Infinity, // Don't auto-dismiss emergencies
        position: 'top-center',
        style: {
          background: '#dc2626',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px',
        },
      });

      // Play alert sound
      try {
        const audio = new Audio('/sounds/alert.mp3');
        audio.play().catch(() => {});
      } catch (e) {}

      queryClient.invalidateQueries({ queryKey: ['emergency'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    };

    const handleEmergencyResolved = (data: any) => {
      console.log('✅ Emergency resolved:', data);
      toast.success(`✅ Emergency resolved by ${data.resolvedBy}`, {
        duration: 8000,
      });
      queryClient.invalidateQueries({ queryKey: ['emergency'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    };

    // ============================================================================
    // MEDICATION EVENTS
    // ============================================================================

    const handleMedicationLogged = (data: any) => {
      console.log('💊 Medication logged:', data);
      toast.success(`💊 ${data.medicationName} logged by ${data.loggedBy || data.loggedByName}`, {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['medication-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    };

    const handleMedicationReminder = (data: any) => {
      console.log('⏰ Medication reminder:', data);
      toast(`💊 Time for ${data.medicationName}`, {
        icon: '⏰',
        duration: 10000,
      });
    };

    // ============================================================================
    // APPOINTMENT EVENTS
    // ============================================================================

    const handleAppointmentCreated = (data: any) => {
      console.log('📅 Appointment created:', data);
      toast.success('📅 New appointment created', {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    };

    const handleAppointmentUpdated = (data: any) => {
      console.log('📅 Appointment updated:', data);
      toast('📅 Appointment updated', {
        duration: 4000,
      });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    };

    const handleAppointmentReminder = (data: any) => {
      console.log('⏰ Appointment reminder:', data);
      toast(`📅 Reminder: ${data.title || data.appointmentTitle} at ${data.time || data.appointmentTime}`, {
        icon: '🏥',
        duration: 10000,
      });
    };

    // ============================================================================
    // SHIFT EVENTS
    // ============================================================================

    const handleShiftUpdate = (data: any) => {
      console.log('👨‍⚕️ Shift update:', data);

      if (data.type === 'check_in') {
        toast.success(`👨‍⚕️ ${data.caregiver?.name || 'Caregiver'} checked in`, {
          duration: 5000,
        });
      } else if (data.type === 'check_out') {
        const message = data.handoffNotes
          ? `👋 ${data.caregiver?.name || 'Caregiver'} checked out - ${data.handoffNotes}`
          : `👋 ${data.caregiver?.name || 'Caregiver'} checked out`;

        toast(message, {
          duration: 8000,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['on-duty'] });
      queryClient.invalidateQueries({ queryKey: ['caregivers'] });
    };

    // ============================================================================
    // TIMELINE EVENTS
    // ============================================================================

    const handleTimelineEntry = (data: any) => {
      console.log('📝 Timeline entry:', data);
      if (data.createdBy || data.createdByName) {
        toast(`📝 ${data.createdBy || data.createdByName} added: ${data.title}`, {
          duration: 5000,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    };

    // ============================================================================
    // FAMILY EVENTS
    // ============================================================================

    const handleFamilyMemberJoined = (data: any) => {
      console.log('👋 Family member joined:', data);
      toast.success(`👋 ${data.memberName} joined the family!`, {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['family'] });
    };

    // ============================================================================
    // GENERIC EVENTS
    // ============================================================================

    const handleNotification = (data: any) => {
      console.log('🔔 Notification:', data);
      toast(data.message, { icon: data.icon || 'ℹ️', duration: 5000 });
    };

    const handleBroadcast = (data: any) => {
      console.log('📡 Broadcast event:', data);
      // Handle generic broadcast events
    };

    const handleEmergencyNotification = (data: any) => {
      console.warn('🚨 Emergency notification broadcast:', data);
      // Fallback emergency notification
    };

    // ============================================================================
    // REGISTER ALL LISTENERS
    // ============================================================================

    wsClient.on(WS_EVENTS.EMERGENCY_ALERT, handleEmergencyAlert);
    wsClient.on(WS_EVENTS.EMERGENCY_RESOLVED, handleEmergencyResolved);
    wsClient.on(WS_EVENTS.MEDICATION_LOGGED, handleMedicationLogged);
    wsClient.on(WS_EVENTS.MEDICATION_REMINDER, handleMedicationReminder);
    wsClient.on(WS_EVENTS.APPOINTMENT_CREATED, handleAppointmentCreated);
    wsClient.on(WS_EVENTS.APPOINTMENT_UPDATED, handleAppointmentUpdated);
    wsClient.on(WS_EVENTS.APPOINTMENT_REMINDER, handleAppointmentReminder);
    wsClient.on(WS_EVENTS.TIMELINE_ENTRY, handleTimelineEntry);
    wsClient.on(WS_EVENTS.SHIFT_UPDATE, handleShiftUpdate);
    wsClient.on(WS_EVENTS.FAMILY_MEMBER_JOINED, handleFamilyMemberJoined);
    wsClient.on(WS_EVENTS.NOTIFICATION, handleNotification);
    wsClient.on(WS_EVENTS.WS_BROADCAST, handleBroadcast);
    wsClient.on(WS_EVENTS.EMERGENCY_NOTIFICATION, handleEmergencyNotification);

    // Cleanup
    return () => {
      wsClient.off(WS_EVENTS.EMERGENCY_ALERT, handleEmergencyAlert);
      wsClient.off(WS_EVENTS.EMERGENCY_RESOLVED, handleEmergencyResolved);
      wsClient.off(WS_EVENTS.MEDICATION_LOGGED, handleMedicationLogged);
      wsClient.off(WS_EVENTS.MEDICATION_REMINDER, handleMedicationReminder);
      wsClient.off(WS_EVENTS.APPOINTMENT_CREATED, handleAppointmentCreated);
      wsClient.off(WS_EVENTS.APPOINTMENT_UPDATED, handleAppointmentUpdated);
      wsClient.off(WS_EVENTS.APPOINTMENT_REMINDER, handleAppointmentReminder);
      wsClient.off(WS_EVENTS.TIMELINE_ENTRY, handleTimelineEntry);
      wsClient.off(WS_EVENTS.SHIFT_UPDATE, handleShiftUpdate);
      wsClient.off(WS_EVENTS.FAMILY_MEMBER_JOINED, handleFamilyMemberJoined);
      wsClient.off(WS_EVENTS.NOTIFICATION, handleNotification);
      wsClient.off(WS_EVENTS.WS_BROADCAST, handleBroadcast);
      wsClient.off(WS_EVENTS.EMERGENCY_NOTIFICATION, handleEmergencyNotification);
    };
  }, [isConnected, queryClient]);

  const emit = useCallback((event: string, data: any) => {
    wsClient.emit(event, data);
  }, []);

  return {
    isConnected,
    emit,
  };
}
