import { generateGoogleCalendarLink } from './googleCalendarCreatEvent';

export function generateConfirmationEmail(
  visitorName: string,
  registrationCode: string,
  qrCodeUrl: string,
) {
  const googleCalendarLink = generateGoogleCalendarLink(
    'Business Fair 2025',
    '2025-02-15T09:00:00',
    '2025-02-15T18:00:00',
    'Main Exhibition Hall, Business Convention Center',
    'Your entry QR code is required for check-in.',
  );

  return `
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center;">
          <h1>Welcome, ${visitorName}!</h1>
          <p>Thank you for registering for the <strong>Business Fair 2025</strong>.</p>
          <p>Your QR Code:</p>
          <img src="${qrCodeUrl}" alt="QR Code" width="200" height="200">
          <p><strong>Registration Code:</strong> ${registrationCode}</p>
          <p><a href="${googleCalendarLink}" target="_blank" 
            style="display: inline-block; background-color: #4285F4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            📅 Save to Google Calendar
          </a></p>
        </body>
      </html>
    `;
}
