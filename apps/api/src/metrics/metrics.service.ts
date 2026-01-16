import { Injectable, OnModuleInit } from '@nestjs/common';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

/**
 * Prometheus Metrics Service
 *
 * To use with Prometheus:
 * 1. Install: npm install prom-client
 * 2. Add this service to your module
 * 3. Configure Prometheus to scrape /metrics endpoint
 * 4. View metrics in Grafana
 *
 * Example Prometheus config:
 * scrape_configs:
 *   - job_name: 'carecircle-api'
 *     static_configs:
 *       - targets: ['localhost:4000']
 *     metrics_path: '/metrics'
 */

@Injectable()
export class MetricsService implements OnModuleInit {
  // HTTP metrics
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;

  // Business metrics
  private activeUsersGauge: Gauge<string>;
  private activeFamiliesGauge: Gauge<string>;
  private emergencyAlertsTotal: Counter<string>;
  private medicationLogsTotal: Counter<string>;
  private appointmentsTotal: Counter<string>;

  onModuleInit() {
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register });

    // HTTP request counter
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    // HTTP request duration
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [register],
    });

    // Business metrics
    this.activeUsersGauge = new Gauge({
      name: 'active_users',
      help: 'Number of active users',
      registers: [register],
    });

    this.activeFamiliesGauge = new Gauge({
      name: 'active_families',
      help: 'Number of active families',
      registers: [register],
    });

    this.emergencyAlertsTotal = new Counter({
      name: 'emergency_alerts_total',
      help: 'Total number of emergency alerts created',
      labelNames: ['type', 'status'],
      registers: [register],
    });

    this.medicationLogsTotal = new Counter({
      name: 'medication_logs_total',
      help: 'Total number of medication logs',
      labelNames: ['status'],
      registers: [register],
    });

    this.appointmentsTotal = new Counter({
      name: 'appointments_total',
      help: 'Total number of appointments created',
      labelNames: ['type', 'status'],
      registers: [register],
    });
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Method to track HTTP requests (call from middleware)
  trackHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestsTotal.labels(method, route, statusCode.toString()).inc();
    this.httpRequestDuration.labels(method, route, statusCode.toString()).observe(duration);
  }

  // Business metric trackers
  setActiveUsers(count: number) {
    this.activeUsersGauge.set(count);
  }

  setActiveFamilies(count: number) {
    this.activeFamiliesGauge.set(count);
  }

  trackEmergencyAlert(type: string, status: string) {
    this.emergencyAlertsTotal.labels(type, status).inc();
  }

  trackMedicationLog(status: string) {
    this.medicationLogsTotal.labels(status).inc();
  }

  trackAppointment(type: string, status: string) {
    this.appointmentsTotal.labels(type, status).inc();
  }
}
