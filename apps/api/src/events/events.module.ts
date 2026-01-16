import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';

import { EXCHANGES, QUEUES } from './events.constants';
import { EventPublisherService } from './publishers/event-publisher.service';

// Consumers
import { WebSocketConsumer } from './consumers/websocket.consumer';
import { NotificationConsumer } from './consumers/notification.consumer';
import { AuditConsumer } from './consumers/audit.consumer';

@Global()
@Module({
  imports: [
    ConfigModule,
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('rabbitmq.url'),
        connectionInitOptions: {
          wait: true,
          timeout: 30000,
        },
        prefetchCount: configService.get<number>('rabbitmq.prefetchCount', 10),
        enableControllerDiscovery: true,
        exchanges: [
          {
            name: EXCHANGES.DOMAIN_EVENTS,
            type: 'topic',
            options: { durable: true },
          },
          {
            name: EXCHANGES.NOTIFICATIONS,
            type: 'direct',
            options: { durable: true },
          },
          {
            name: EXCHANGES.DEAD_LETTER,
            type: 'direct',
            options: { durable: true },
          },
          {
            name: EXCHANGES.AUDIT,
            type: 'fanout',
            options: { durable: true },
          },
        ],
        queues: [
          // WebSocket updates queue
          {
            name: QUEUES.WEBSOCKET_UPDATES,
            options: {
              durable: true,
              arguments: {
                'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
                'x-dead-letter-routing-key': QUEUES.DLQ_PROCESSING,
              },
            },
          },
          // Notification queues
          {
            name: QUEUES.PUSH_NOTIFICATIONS,
            options: {
              durable: true,
              arguments: {
                'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
                'x-dead-letter-routing-key': QUEUES.DLQ_NOTIFICATIONS,
              },
            },
          },
          {
            name: QUEUES.EMAIL_NOTIFICATIONS,
            options: {
              durable: true,
              arguments: {
                'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER,
                'x-dead-letter-routing-key': QUEUES.DLQ_NOTIFICATIONS,
              },
            },
          },
          // Audit queue
          {
            name: QUEUES.AUDIT_LOG,
            options: { durable: true },
          },
          // Dead letter queues
          {
            name: QUEUES.DLQ_NOTIFICATIONS,
            options: { durable: true },
          },
          {
            name: QUEUES.DLQ_PROCESSING,
            options: { durable: true },
          },
        ],
        connectionManagerOptions: {
          reconnectTimeInSeconds: configService.get<number>('rabbitmq.reconnectTimeInSeconds', 5),
          heartbeatIntervalInSeconds: configService.get<number>('rabbitmq.heartbeatIntervalInSeconds', 30),
        },
      }),
    }),
  ],
  providers: [
    EventPublisherService,
    WebSocketConsumer,
    NotificationConsumer,
    AuditConsumer,
  ],
  exports: [EventPublisherService],
})
export class EventsModule {}

