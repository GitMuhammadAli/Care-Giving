'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient, WS_EVENTS } from '@/lib/websocket';
import { useAuth } from './use-auth';
import toast from 'react-hot-toast';

// Use selectors to prevent re-renders on unrelated auth state changes
const selectUser = (state: any) => state.user;
const selectIsAuthenticated = (state: any) => state.isAuthenticated;

export function useWebSocket(familyId?: string) {
  // Use shallow equality for selectors to prevent unnecessary re-renders
  const user = useAuth(selectUser);
  const isAuthenticated = useAuth(selectIsAuthenticated);
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const hasConnectedRef = useRef(false);

  // Connect to WebSocket - only once when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    // Prevent multiple connection attempts
    if (hasConnectedRef.current) return;

    const connect = async () => {
      try {
        // Use a dummy token since we're using withCredentials (cookies)
        await wsClient.connect('authenticated');
        setIsConnected(true);
        hasConnectedRef.current = true;

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
        // Silently handle connection errors - WebSocket will retry
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (familyId) {
        wsClient.leaveFamily(familyId);
      }
      // Disconnect WebSocket on unmount to prevent leaked connections
      if (hasConnectedRef.current) {
        wsClient.disconnect();
        hasConnectedRef.current = false;
        setIsConnected(false);
      }
    };
  }, [isAuthenticated, user?.id, familyId]); // Only depend on user.id, not entire user object

  // Set up event listeners
  useEffect(() => {
    if (!isConnected) return;

    // ============================================================================
    // EMERGENCY EVENTS
    // ============================================================================

    const handleEmergencyAlert = (data: any) => {
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
      toast.success(`💊 ${data.medicationName} logged by ${data.loggedBy || data.loggedByName}`, {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['medication-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    };

    const handleMedicationReminder = (data: any) => {
      toast(`💊 Time for ${data.medicationName}`, {
        icon: '⏰',
        duration: 10000,
      });
    };

    // ============================================================================
    // APPOINTMENT EVENTS
    // ============================================================================

    const handleAppointmentCreated = (data: any) => {
      toast.success('📅 New appointment created', {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    };

    const handleAppointmentUpdated = (data: any) => {
      toast('📅 Appointment updated', {
        duration: 4000,
      });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    };

    const handleAppointmentReminder = (data: any) => {
      toast(`📅 Reminder: ${data.title || data.appointmentTitle} at ${data.time || data.appointmentTime}`, {
        icon: '🏥',
        duration: 10000,
      });
    };

    // ============================================================================
    // SHIFT EVENTS
    // ============================================================================

    const handleShiftUpdate = (data: any) => {
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
      toast.success(`👋 ${data.memberName} joined the family!`, {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['family'] });
    };

    // ============================================================================
    // ADMIN ACTION EVENTS
    // ============================================================================

    const handleCareRecipientDeleted = (data: any) => {
      toast.error(`${data.deletedBy} removed ${data.careRecipientName}`, {
        duration: 8000,
      });
      queryClient.invalidateQueries({ queryKey: ['care-recipients'] });
      queryClient.invalidateQueries({ queryKey: ['family'] });
    };

    const handleCareRecipientUpdated = (data: any) => {
      toast(`${data.updatedBy} updated ${data.careRecipientName}'s profile`, {
        icon: '✏️',
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['care-recipients'] });
      queryClient.invalidateQueries({ queryKey: ['care-recipient', data.careRecipientId] });
    };

    const handleFamilyMemberRemoved = (data: any) => {
      toast(`${data.removedBy} removed ${data.memberName} from the family`, {
        icon: '👋',
        duration: 6000,
      });
      queryClient.invalidateQueries({ queryKey: ['family'] });
    };

    const handleYouWereRemoved = (data: any) => {
      toast.error(`You have been removed from ${data.familyName} by ${data.removedBy}`, {
        duration: Infinity, // Don't auto-dismiss - this is important
      });
      // Force refresh to update user data
      queryClient.invalidateQueries({ queryKey: ['family'] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    };

    const handleFamilyMemberRoleUpdated = (data: any) => {
      toast(`${data.memberName}'s role changed to ${data.newRole}`, {
        icon: '🔄',
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['family'] });
    };

    const handleYourRoleChanged = (data: any) => {
      toast(`Your role in ${data.familyName} is now ${data.newRole}`, {
        icon: '🎭',
        duration: 8000,
      });
      queryClient.invalidateQueries({ queryKey: ['family'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    };

    const handleMedicationDeleted = (data: any) => {
      toast(`${data.deletedBy} removed ${data.medicationName}`, {
        icon: '💊',
        duration: 6000,
      });
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    };

    const handleAppointmentDeleted = (data: any) => {
      toast(`${data.deletedBy} deleted "${data.appointmentTitle}"`, {
        icon: '📅',
        duration: 6000,
      });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    };

    const handleFamilyDeleted = (data: any) => {
      toast.error(`${data.deletedBy} deleted the family "${data.familyName}"`, {
        duration: Infinity,
      });
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['family'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    };

    // ============================================================================
    // DOCUMENT EVENTS
    // ============================================================================

    const handleDocumentUploaded = (data: any) => {
      toast.success(`📄 ${data.uploadedBy} uploaded "${data.documentName}"`, {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    };

    const handleDocumentDeleted = (data: any) => {
      toast(`${data.deletedBy} deleted "${data.documentName}"`, {
        icon: '📄',
        duration: 6000,
      });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    };

    // ============================================================================
    // GENERIC EVENTS
    // ============================================================================

    const handleNotification = (data: any) => {
      toast(data.message, { icon: data.icon || 'ℹ️', duration: 5000 });
    };

    const handleBroadcast = (_data: any) => {
      // Handle generic broadcast events
    };

    const handleEmergencyNotification = (_data: any) => {
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

    // Admin action events
    wsClient.on(WS_EVENTS.CARE_RECIPIENT_DELETED, handleCareRecipientDeleted);
    wsClient.on(WS_EVENTS.CARE_RECIPIENT_UPDATED, handleCareRecipientUpdated);
    wsClient.on(WS_EVENTS.FAMILY_MEMBER_REMOVED, handleFamilyMemberRemoved);
    wsClient.on(WS_EVENTS.YOU_WERE_REMOVED, handleYouWereRemoved);
    wsClient.on(WS_EVENTS.FAMILY_MEMBER_ROLE_UPDATED, handleFamilyMemberRoleUpdated);
    wsClient.on(WS_EVENTS.YOUR_ROLE_CHANGED, handleYourRoleChanged);
    wsClient.on(WS_EVENTS.MEDICATION_DELETED, handleMedicationDeleted);
    wsClient.on(WS_EVENTS.APPOINTMENT_DELETED, handleAppointmentDeleted);
    wsClient.on(WS_EVENTS.FAMILY_DELETED, handleFamilyDeleted);

    // Document events
    wsClient.on(WS_EVENTS.DOCUMENT_UPLOADED, handleDocumentUploaded);
    wsClient.on(WS_EVENTS.DOCUMENT_DELETED, handleDocumentDeleted);

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

      // Admin action events cleanup
      wsClient.off(WS_EVENTS.CARE_RECIPIENT_DELETED, handleCareRecipientDeleted);
      wsClient.off(WS_EVENTS.CARE_RECIPIENT_UPDATED, handleCareRecipientUpdated);
      wsClient.off(WS_EVENTS.FAMILY_MEMBER_REMOVED, handleFamilyMemberRemoved);
      wsClient.off(WS_EVENTS.YOU_WERE_REMOVED, handleYouWereRemoved);
      wsClient.off(WS_EVENTS.FAMILY_MEMBER_ROLE_UPDATED, handleFamilyMemberRoleUpdated);
      wsClient.off(WS_EVENTS.YOUR_ROLE_CHANGED, handleYourRoleChanged);
      wsClient.off(WS_EVENTS.MEDICATION_DELETED, handleMedicationDeleted);
      wsClient.off(WS_EVENTS.APPOINTMENT_DELETED, handleAppointmentDeleted);
      wsClient.off(WS_EVENTS.FAMILY_DELETED, handleFamilyDeleted);

      // Document events cleanup
      wsClient.off(WS_EVENTS.DOCUMENT_UPLOADED, handleDocumentUploaded);
      wsClient.off(WS_EVENTS.DOCUMENT_DELETED, handleDocumentDeleted);
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
