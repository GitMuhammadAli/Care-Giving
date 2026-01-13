'use client';

import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient, WS_EVENTS } from '@/lib/websocket';
import { useAuth } from './use-auth';
import toast from 'react-hot-toast';

export function useWebSocket(familyId?: string) {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const connect = async () => {
      try {
        await wsClient.connect(token);
        setIsConnected(true);

        if (familyId) {
          wsClient.joinFamily(familyId);
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
  }, [isAuthenticated, token, familyId]);

  // Set up event listeners
  useEffect(() => {
    if (!isConnected) return;

    // Emergency alerts - high priority
    const handleEmergencyAlert = (data: any) => {
      toast.error(`🚨 EMERGENCY: ${data.message}`, {
        duration: 10000,
        position: 'top-center',
      });
      queryClient.invalidateQueries({ queryKey: ['emergency'] });
    };

    // Medication logged
    const handleMedicationLogged = (data: any) => {
      toast.success(`💊 ${data.medicationName} logged by ${data.loggedBy}`);
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    };

    // Medication reminder
    const handleMedicationReminder = (data: any) => {
      toast(`💊 Time for ${data.medicationName}`, {
        icon: '⏰',
        duration: 8000,
      });
    };

    // Appointment reminder
    const handleAppointmentReminder = (data: any) => {
      toast(`📅 Upcoming: ${data.title} at ${data.time}`, {
        icon: '🏥',
        duration: 8000,
      });
    };

    // Timeline entry
    const handleTimelineEntry = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    };

    // Shift update
    const handleShiftUpdate = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['caregivers'] });
    };

    // Family member joined
    const handleFamilyMemberJoined = (data: any) => {
      toast.success(`👋 ${data.memberName} joined the family!`);
      queryClient.invalidateQueries({ queryKey: ['family'] });
    };

    // Generic notification
    const handleNotification = (data: any) => {
      toast(data.message, { icon: data.icon || 'ℹ️' });
    };

    // Register listeners
    wsClient.on(WS_EVENTS.EMERGENCY_ALERT, handleEmergencyAlert);
    wsClient.on(WS_EVENTS.MEDICATION_LOGGED, handleMedicationLogged);
    wsClient.on(WS_EVENTS.MEDICATION_REMINDER, handleMedicationReminder);
    wsClient.on(WS_EVENTS.APPOINTMENT_REMINDER, handleAppointmentReminder);
    wsClient.on(WS_EVENTS.TIMELINE_ENTRY, handleTimelineEntry);
    wsClient.on(WS_EVENTS.SHIFT_UPDATE, handleShiftUpdate);
    wsClient.on(WS_EVENTS.FAMILY_MEMBER_JOINED, handleFamilyMemberJoined);
    wsClient.on(WS_EVENTS.NOTIFICATION, handleNotification);

    return () => {
      wsClient.off(WS_EVENTS.EMERGENCY_ALERT, handleEmergencyAlert);
      wsClient.off(WS_EVENTS.MEDICATION_LOGGED, handleMedicationLogged);
      wsClient.off(WS_EVENTS.MEDICATION_REMINDER, handleMedicationReminder);
      wsClient.off(WS_EVENTS.APPOINTMENT_REMINDER, handleAppointmentReminder);
      wsClient.off(WS_EVENTS.TIMELINE_ENTRY, handleTimelineEntry);
      wsClient.off(WS_EVENTS.SHIFT_UPDATE, handleShiftUpdate);
      wsClient.off(WS_EVENTS.FAMILY_MEMBER_JOINED, handleFamilyMemberJoined);
      wsClient.off(WS_EVENTS.NOTIFICATION, handleNotification);
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

