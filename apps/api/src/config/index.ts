/**
 * Centralized Configuration Module
 * =================================
 * Single source of truth for all environment configuration.
 *
 * SWITCHING LOCAL VS THIRD-PARTY:
 * - Open your .env file
 * - Comment/uncomment the appropriate blocks (Local Stack vs Third-Party Stack)
 * - Restart the application
 * - Active providers are determined by: STORAGE_PROVIDER, MAIL_PROVIDER, and service connection details
 *
 * This module supports both configurations without code changes.
 */

import { registerAs } from "@nestjs/config";
import {
  optionalString,
  int,
  bool,
  optionalPassword,
  isDevelopment,
  isProduction,
} from "./env.helpers";

// =============================================================================
// APP CONFIG
// =============================================================================
export const appConfig = registerAs("app", () => ({
  nodeEnv: optionalString("NODE_ENV", "development"),
  port: int("PORT", 4000),
  apiPrefix: optionalString("API_PREFIX", "api/v1"),
  frontendUrl: optionalString("FRONTEND_URL", "http://localhost:4173"),
  isDevelopment: isDevelopment(),
  isProduction: isProduction(),
}));

// =============================================================================
// DATABASE CONFIG
// Supports: DATABASE_URL (preferred) or individual DB_* variables
// =============================================================================
export const databaseConfig = registerAs("database", () => {
  const databaseUrl = optionalString("DATABASE_URL");
  const dbSsl = bool("DB_SSL", false);
  const isProd = isProduction();

  // Use DATABASE_URL if provided, otherwise build from components
  if (databaseUrl) {
    return {
      type: "postgres" as const,
      url: databaseUrl,
      ssl: dbSsl || isProd ? { rejectUnauthorized: false } : false,
      synchronize: false,
      logging: isDevelopment(),
    };
  }

  return {
    type: "postgres" as const,
    host: optionalString("DB_HOST", "localhost"),
    port: int("DB_PORT", 5432),
    username: optionalString("DB_USERNAME", "postgres"),
    password: optionalString("DB_PASSWORD", ""),
    database: optionalString("DB_DATABASE", "carecircle"),
    ssl: dbSsl || isProd ? { rejectUnauthorized: false } : false,
    synchronize: false,
    logging: isDevelopment(),
  };
});

// =============================================================================
// REDIS CONFIG
// Supports: Local (no TLS/password) or Third-party (TLS + password like Upstash)
// =============================================================================
export const redisConfig = registerAs("redis", () => {
  const host = optionalString("REDIS_HOST", "localhost");
  const port = int("REDIS_PORT", 6379);
  const password = optionalPassword("REDIS_PASSWORD");
  const tls = bool("REDIS_TLS", false);

  // Upstash REST API support (optional, only used if your code needs it)
  const upstashRestUrl = optionalString("UPSTASH_REDIS_REST_URL");
  const upstashRestToken = optionalString("UPSTASH_REDIS_REST_TOKEN");

  return {
    host,
    port,
    password,
    tls,
    // Upstash REST API (optional)
    upstash:
      upstashRestUrl && upstashRestToken
        ? {
            url: upstashRestUrl,
            token: upstashRestToken,
          }
        : null,
  };
});

// =============================================================================
// AMQP/RABBITMQ CONFIG
// Supports: AMQP_URL (preferred) or individual AMQP_* variables
// =============================================================================
export const rabbitmqConfig = registerAs("rabbitmq", () => {
  const amqpUrl = optionalString("AMQP_URL");

  // If AMQP_URL is provided, use it directly
  if (amqpUrl) {
    return {
      url: amqpUrl,
      prefetchCount: int("RABBITMQ_PREFETCH", 10),
      reconnectTimeInSeconds: int("RABBITMQ_RECONNECT_TIME", 5),
      heartbeatIntervalInSeconds: int("RABBITMQ_HEARTBEAT", 30),
    };
  }

  // Build URL from components
  const host = optionalString("AMQP_HOST", "localhost");
  const user = optionalString("AMQP_USER", "guest");
  const password = optionalString("AMQP_PASSWORD", "guest");
  const vhost = optionalString("AMQP_VHOST", "/");
  const useTls = bool("AMQP_TLS", false);
  const port = useTls ? int("AMQP_TLS_PORT", 5671) : int("AMQP_PORT", 5672);
  const protocol = useTls ? "amqps" : "amqp";

  // Encode vhost properly (/ becomes empty in URL)
  const encodedVhost = vhost === "/" ? "" : encodeURIComponent(vhost);
  const url = `${protocol}://${user}:${password}@${host}:${port}/${encodedVhost}`;

  return {
    url,
    prefetchCount: int("RABBITMQ_PREFETCH", 10),
    reconnectTimeInSeconds: int("RABBITMQ_RECONNECT_TIME", 5),
    heartbeatIntervalInSeconds: int("RABBITMQ_HEARTBEAT", 30),
  };
});

// =============================================================================
// MQTT CONFIG
// Supports: Local or third-party MQTT brokers
// =============================================================================
export const mqttConfig = registerAs("mqtt", () => {
  const host = optionalString("MQTT_HOST", "localhost");
  const useTls = bool("MQTT_TLS", false);
  const port = useTls ? int("MQTT_TLS_PORT", 8883) : int("MQTT_PORT", 1883);
  const username = optionalString("MQTT_USERNAME", "guest");
  const password = optionalString("MQTT_PASSWORD", "guest");

  return {
    host,
    port,
    tls: useTls,
    username,
    password,
  };
});

// =============================================================================
// JWT CONFIG
// =============================================================================
export const jwtConfig = registerAs("jwt", () => ({
  secret: optionalString("JWT_SECRET", "REPLACE_ME_MIN_32_CHARS"),
  refreshSecret: optionalString(
    "JWT_REFRESH_SECRET",
    "REPLACE_ME_MIN_32_CHARS"
  ),
  expiresIn: optionalString("JWT_EXPIRES_IN", "15m"),
  refreshExpiresIn: optionalString("JWT_REFRESH_EXPIRES_IN", "7d"),
}));

// =============================================================================
// SECURITY CONFIG
// =============================================================================
export const securityConfig = registerAs("security", () => ({
  encryptionKey: optionalString(
    "ENCRYPTION_KEY",
    "0123456789abcdef0123456789abcdef"
  ),
  otpExpiresIn: int("OTP_EXPIRES_IN", 300),
  maxLoginAttempts: int("MAX_LOGIN_ATTEMPTS", 5),
  lockoutDuration: int("LOCKOUT_DURATION", 1800),
}));

// =============================================================================
// STORAGE CONFIG
// Provider-aware: Only validates keys for the selected STORAGE_PROVIDER
// =============================================================================
export const storageConfig = registerAs("storage", () => {
  const provider = optionalString("STORAGE_PROVIDER", "cloudinary");

  const config: any = {
    provider,
  };

  // Cloudinary configuration
  if (provider === "cloudinary") {
    config.cloudinary = {
      cloudName: optionalString("CLOUDINARY_CLOUD_NAME"),
      apiKey: optionalString("CLOUDINARY_API_KEY"),
      apiSecret: optionalString("CLOUDINARY_API_SECRET"),
      folder: optionalString("CLOUDINARY_FOLDER", "carecircle"),
      url: optionalString("CLOUDINARY_URL"),
    };
  }

  // S3/MinIO configuration
  if (provider === "s3") {
    config.s3 = {
      accessKeyId: optionalString("AWS_ACCESS_KEY_ID"),
      secretAccessKey: optionalString("AWS_SECRET_ACCESS_KEY"),
      region: optionalString("AWS_REGION", "us-east-1"),
      bucket: optionalString("S3_BUCKET", "carecircle-documents"),
      endpoint: optionalString("S3_ENDPOINT"),
    };
  }

  // Uploadthing configuration
  if (provider === "uploadthing") {
    config.uploadthing = {
      secret: optionalString("UPLOADTHING_SECRET"),
      appId: optionalString("UPLOADTHING_APP_ID"),
    };
  }

  return config;
});

// =============================================================================
// MAIL CONFIG
// Provider-aware: Only validates keys for the selected MAIL_PROVIDER
// EMAIL_FROM/EMAIL_FROM_NAME are fallbacks for MAIL_FROM/MAIL_FROM_NAME
// =============================================================================
export const mailConfig = registerAs("mail", () => {
  const provider = optionalString("MAIL_PROVIDER", "mailtrap");

  // Support EMAIL_FROM as fallback for backward compatibility
  const from =
    optionalString("MAIL_FROM") ||
    optionalString("EMAIL_FROM", "noreply@carecircle.com");
  const fromName =
    optionalString("MAIL_FROM_NAME") ||
    optionalString("EMAIL_FROM_NAME", "CareCircle");

  const config: any = {
    provider,
    from,
    fromName,
  };

  // Mailtrap SMTP configuration
  if (provider === "mailtrap") {
    config.mailtrap = {
      host: optionalString("MAILTRAP_HOST", "sandbox.smtp.mailtrap.io"),
      port: int("MAILTRAP_PORT", 2525),
      user: optionalString("MAILTRAP_USER"),
      pass: optionalString("MAILTRAP_PASS"),
      // Legacy API token support
      token: optionalString("MAILTRAP_TOKEN"),
      inboxId: optionalString("MAILTRAP_INBOX_ID"),
    };
  }

  // Generic SMTP configuration
  if (provider === "smtp") {
    config.smtp = {
      host: optionalString("MAIL_HOST"),
      port: int("MAIL_PORT", 587),
      user: optionalString("MAIL_USER"),
      password: optionalString("MAIL_PASSWORD"),
      secure: bool("MAIL_SECURE", false),
    };
  }

  // Resend configuration
  if (provider === "resend") {
    config.resend = {
      apiKey: optionalString("RESEND_API_KEY"),
    };
  }

  // Brevo configuration
  if (provider === "brevo") {
    config.brevo = {
      apiKey: optionalString("BREVO_API_KEY"),
    };
  }

  return config;
});

// =============================================================================
// PUSH NOTIFICATIONS CONFIG
// Only required if your app uses web-push
// =============================================================================
export const pushConfig = registerAs("push", () => {
  const vapidPublicKey = optionalString("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const vapidPrivateKey = optionalString("VAPID_PRIVATE_KEY");
  const vapidSubject = optionalString(
    "VAPID_SUBJECT",
    "mailto:admin@carecircle.com"
  );

  return {
    enabled: !!(vapidPublicKey && vapidPrivateKey),
    vapid: {
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
      subject: vapidSubject,
    },
  };
});

// =============================================================================
// Note: Firebase removed - using Web Push (VAPID) for push notifications
// See pushConfig above for VAPID configuration
// =============================================================================

// =============================================================================
// ANALYTICS CONFIG (Optional)
// =============================================================================
export const analyticsConfig = registerAs("analytics", () => ({
  sentry: {
    dsn: optionalString("SENTRY_DSN"),
  },
  posthog: {
    apiKey: optionalString("POSTHOG_API_KEY"),
    host: optionalString("POSTHOG_HOST", "https://app.posthog.com"),
  },
  mixpanel: {
    token: optionalString("MIXPANEL_TOKEN"),
  },
}));

// =============================================================================
// WEBSOCKET CONFIG
// =============================================================================
export const websocketConfig = registerAs("websocket", () => ({
  url: optionalString("NEXT_PUBLIC_WS_URL", "http://localhost:4000"),
}));

// =============================================================================
// EXPORT ALL CONFIGS
// =============================================================================
export default [
  appConfig,
  databaseConfig,
  redisConfig,
  rabbitmqConfig,
  mqttConfig,
  jwtConfig,
  securityConfig,
  storageConfig,
  mailConfig,
  pushConfig,
  analyticsConfig,
  websocketConfig,
];
