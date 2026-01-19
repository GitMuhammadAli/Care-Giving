import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('CareCircle API')
    .setDescription(
      `
## CareCircle API Documentation

Family caregiving coordination platform API.

---

## 🔐 How to Authenticate

1. **Register** a new account using \`POST /auth/register\`
2. **Verify email** with the OTP sent to your email using \`POST /auth/verify-email\`
3. **Login** using \`POST /auth/login\` to get your JWT tokens
4. **Copy** the \`accessToken\` from the login response
5. **Click** the green **Authorize** button (🔓) at the top right
6. **Paste** your token and click **Authorize**
7. Now all protected endpoints will work!

---

## 📋 Quick Test Flow

\`\`\`
1. POST /auth/register → Create account
2. POST /auth/verify-email → Verify with OTP (check logs if no email)
3. POST /auth/login → Get tokens ⭐ COPY accessToken
4. Click Authorize 🔓 → Paste token
5. GET /auth/me → Verify it works!
6. POST /families → Create a family
7. POST /families/{id}/care-recipients → Add care recipient
\`\`\`

---

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
        description: 'Paste your accessToken from /auth/login response here',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication & Authorization - Start here!')
    .addTag('Users', 'User profile management')
    .addTag('Families', 'Family management')
    .addTag('Care Recipients', 'Care recipient management')
    .addTag('Medications', 'Medication tracking and reminders')
    .addTag('Appointments', 'Appointment scheduling')
    .addTag('Caregiver Shifts', 'Shift management and handoffs')
    .addTag('Timeline', 'Care timeline and vitals logging')
    .addTag('Emergency', 'Emergency alerts and contacts')
    .addTag('Documents', 'Document management')
    .addTag('Notifications', 'Push notifications')
    .addTag('Chat', 'Real-time chat')
    .addTag('Health', 'API health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const options = {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
      tryItOutEnabled: true,
    },
    customSiteTitle: 'CareCircle API Docs',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin-bottom: 20px }
      .swagger-ui .info .title { font-size: 32px }
      .swagger-ui .scheme-container { padding: 15px; background: #fafafa; margin-bottom: 20px }
    `,
  };

  SwaggerModule.setup('api', app, document, options);
}

