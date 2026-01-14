'use client';

import { AlertTriangle, X, Phone, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Alert {
  id: number;
  type: 'emergency' | 'urgent' | 'info';
  title: string;
  message: string;
  time: string;
  actionRequired?: boolean;
}

interface EmergencyAlertBannerProps {
  alerts: Alert[];
  onDismiss: (id: number) => void;
  onAcknowledge: (id: number) => void;
}

export const EmergencyAlertBanner = ({ alerts, onDismiss, onAcknowledge }: EmergencyAlertBannerProps) => {
  const emergencyAlerts = alerts.filter(a => a.type === "emergency" && a.actionRequired);

  if (emergencyAlerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-8">
      {emergencyAlerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-destructive/10 border-2 border-destructive/30 rounded-2xl p-5 shadow-lg shadow-destructive/5"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-destructive/20 flex items-center justify-center shrink-0 animate-pulse">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-serif text-lg text-destructive">{alert.title}</h3>
                <span className="text-xs text-muted-foreground flex items-center gap-1 bg-background/50 px-2 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  {alert.time}
                </span>
              </div>
              <p className="text-foreground mb-4 leading-relaxed">{alert.message}</p>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onAcknowledge(alert.id)}
                  className="rounded-xl shadow-sm"
                >
                  I've Seen This
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Now
                </Button>
              </div>
            </div>
            <button
              onClick={() => onDismiss(alert.id)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-background/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
