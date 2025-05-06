// src/utils/emailLayoutGenerator.ts
import { generateGoogleCalendarLink } from './googleCalendarCreatEvent';

/**
 * Gera o template HTML do e-mail de confirmação.
 * Agora aceita o URL do QR code (data URL ou remoto) como parâmetro.
 */
export function generateConfirmationEmail(
  visitorName: string,
  registrationCode: string,
  qrUrl: string,
  eventTitle: string,
  eventStart: string,
  eventEnd: string,
  eventLocation: string,
  eventDescription?: string,
) {
  // 1) link do Google Calendar
  const calendarLink = generateGoogleCalendarLink(
    eventTitle,
    eventStart,
    eventEnd,
    eventLocation,
    eventDescription ?? '',
  );

  return `
    <html>
      <body style="font-family: Arial, sans-serif; text-align: center;">
        <h1>Olá, ${visitorName}!</h1>
        <p>Obrigado por se inscrever na <strong>${eventTitle}</strong>.</p>
        <p>Seu QR Code de inscrição:</p>
        <img src="${qrUrl}" alt="QR Code" width="200" height="200" />
        <p><strong>Código de Inscrição:</strong> ${registrationCode}</p>
        <p>
          <a href="${calendarLink}" target="_blank"
             style="display: inline-block; background-color: #4285F4; color: white;
                    padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            📅 Salvar no Google Calendar
          </a>
        </p>
      </body>
    </html>
  `;
}
