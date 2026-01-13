import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('CareCircle API')
    .setDescription(
      `
## CareCircle API Documentation

Family caregiving coordination platform API.

### Authentication
Most endpoints require JWT authentication. Use the \`/auth/login\` endpoint to obtain tokens.

### Rate Limiting
- Public endpoints: 10 requests/minute
- Authenticated endpoints: 100 requests/minute

### Error Responses
All errors follow a standard format:
\`\`\`json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "path": "/api/v1/resource"
}
\`\`\`

### Supported Languages
- English (en)
- French (fr)

Set the \`X-Language\` header to receive localized error messages.
    `,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('families', 'Family management')
    .addTag('care-recipients', 'Care recipient management')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Protect docs with basic auth in production
  const options = {
    swaggerOptions: {
      persistAuthorization: true,
    },
  };

  SwaggerModule.setup('api', app, document, options);
}

