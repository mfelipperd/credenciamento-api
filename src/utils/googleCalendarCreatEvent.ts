/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export function generateGoogleCalendarLink(
  title: string,
  startDateTime: string,
  endDateTime: string,
  location: string,
  description: string,
) {
  const timeZone = 'America/Sao_Paulo';
  const startDateUTC = new Date(startDateTime);
  const endDateUTC = new Date(endDateTime);

  const startLocal = toZonedTime(startDateUTC, timeZone);
  const endLocal = toZonedTime(endDateUTC, timeZone);

  const formattedStart = format(startLocal, "yyyyMMdd'T'HHmmss");
  const formattedEnd = format(endLocal, "yyyyMMdd'T'HHmmss");

  return (
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${formattedStart}/${formattedEnd}` +
    `&details=${encodeURIComponent(description)}` +
    `&location=${encodeURIComponent(location)}` +
    `&trp=true`
  );
}
