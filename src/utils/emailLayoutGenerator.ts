import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { generateGoogleCalendarLink } from './googleCalendarCreatEvent';

const LOGO_URL =
  'https://www.expomultimix.com.br/_next/image?url=%2Fassets%2Flogo%20EMM_Prancheta%201.png&w=400&q=75';

function formatEventDate(isoString: string): string {
  try {
    const local = toZonedTime(new Date(isoString), 'America/Sao_Paulo');
    return format(local, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return '';
  }
}

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
  const calendarLink =
    eventStart && eventEnd
      ? generateGoogleCalendarLink(
          eventTitle,
          eventStart,
          eventEnd,
          eventLocation,
          eventDescription ?? '',
        )
      : null;

  const formattedDate = eventStart ? formatEventDate(eventStart) : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Inscrição Confirmada – ExpoMultimix</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f0f5;font-family:Arial,Helvetica,sans-serif;">

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0f0f5;">
  <tr>
    <td align="center" style="padding:24px 16px;">

      <!-- Card principal -->
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"
             style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.18);">

        <!-- ── HEADER ── -->
        <tr>
          <td style="background-color:#0f0f2b;padding:32px 30px 24px;text-align:center;">
            <img src="${LOGO_URL}" alt="ExpoMultimix" width="200"
                 style="display:block;margin:0 auto;" />
            <p style="margin:16px 0 0;color:#29ABE2;font-size:11px;letter-spacing:3px;
                      text-transform:uppercase;font-weight:bold;">
              A MAIOR FEIRA MULTISSETORIAL DO NORTE
            </p>
          </td>
        </tr>

        <!-- ── HERO: CONFIRMAÇÃO ── -->
        <tr>
          <td style="background:linear-gradient(135deg,#E8196A 0%,#c4143e 50%,#F26522 100%);
                     padding:44px 30px 36px;text-align:center;">
            <p style="margin:0 0 10px;color:rgba(255,255,255,0.9);font-size:12px;
                      letter-spacing:3px;text-transform:uppercase;font-weight:bold;">
              ✅ &nbsp;INSCRIÇÃO CONFIRMADA
            </p>
            <h1 style="margin:0 0 14px;color:#ffffff;font-size:30px;line-height:1.25;
                       font-weight:900;text-shadow:0 2px 8px rgba(0,0,0,0.2);">
              Bem-vindo(a),<br>${visitorName}!
            </h1>
            <p style="margin:0;color:rgba(255,255,255,0.95);font-size:16px;line-height:1.6;">
              Sua vaga na <strong>${eventTitle}</strong><br>
              está garantida. Guarde este e-mail — você vai precisar!
            </p>
          </td>
        </tr>

        <!-- ── DETALHES DO EVENTO ── -->
        <tr>
          <td style="background-color:#0f0f2b;padding:0 0 4px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>

                <!-- Data -->
                <td width="33%" style="padding:22px 10px;text-align:center;
                            border-right:1px solid rgba(255,255,255,0.08);">
                  <div style="font-size:26px;margin-bottom:6px;">📅</div>
                  <p style="margin:0 0 4px;color:#29ABE2;font-size:10px;
                            text-transform:uppercase;letter-spacing:1.5px;font-weight:bold;">Data</p>
                  <p style="margin:0;color:#ffffff;font-size:13px;font-weight:bold;line-height:1.4;">
                    ${formattedDate || '—'}
                  </p>
                </td>

                <!-- Horário -->
                <td width="34%" style="padding:22px 10px;text-align:center;
                            border-right:1px solid rgba(255,255,255,0.08);">
                  <div style="font-size:26px;margin-bottom:6px;">🕐</div>
                  <p style="margin:0 0 4px;color:#29ABE2;font-size:10px;
                            text-transform:uppercase;letter-spacing:1.5px;font-weight:bold;">Horário</p>
                  <p style="margin:0;color:#ffffff;font-size:13px;font-weight:bold;">13h às 20h</p>
                </td>

                <!-- Local -->
                <td width="33%" style="padding:22px 10px;text-align:center;">
                  <div style="font-size:26px;margin-bottom:6px;">📍</div>
                  <p style="margin:0 0 4px;color:#29ABE2;font-size:10px;
                            text-transform:uppercase;letter-spacing:1.5px;font-weight:bold;">Local</p>
                  <p style="margin:0;color:#ffffff;font-size:13px;font-weight:bold;line-height:1.4;">
                    ${eventLocation || '—'}
                  </p>
                </td>

              </tr>
            </table>
          </td>
        </tr>

        <!-- Faixa decorativa tricolor -->
        <tr>
          <td style="padding:0;line-height:0;font-size:0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td width="33%" height="5" style="background-color:#E8196A;"></td>
                <td width="34%" height="5" style="background-color:#29ABE2;"></td>
                <td width="33%" height="5" style="background-color:#F26522;"></td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── QR CODE ── -->
        <tr>
          <td style="background-color:#ffffff;padding:44px 30px 36px;text-align:center;">
            <h2 style="margin:0 0 8px;color:#0f0f2b;font-size:22px;font-weight:900;">
              Seu QR Code de Acesso
            </h2>
            <p style="margin:0 0 28px;color:#666666;font-size:14px;line-height:1.5;">
              Apresente este código na entrada da feira<br>para efetuar seu credenciamento.
            </p>

            <!-- QR frame -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center"
                   style="border-radius:16px;overflow:hidden;">
              <tr>
                <td style="padding:4px;background:linear-gradient(135deg,#E8196A,#29ABE2,#F26522);
                           border-radius:16px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="background:#ffffff;border-radius:13px;padding:16px;">
                        <img src="${qrUrl}" alt="QR Code de Acesso"
                             width="180" height="180"
                             style="display:block;border:0;" />
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:20px 0 4px;color:#999999;font-size:12px;
                      text-transform:uppercase;letter-spacing:1px;">
              Código de inscrição
            </p>
            <p style="margin:0;color:#0f0f2b;font-size:22px;font-weight:bold;
                      letter-spacing:4px;font-family:'Courier New',monospace;">
              ${registrationCode}
            </p>
          </td>
        </tr>

        <!-- ── CTAs: AGENDA + LEMBRETE ── -->
        <tr>
          <td style="background-color:#f8f9ff;padding:36px 30px;text-align:center;">
            <h2 style="margin:0 0 8px;color:#0f0f2b;font-size:20px;font-weight:900;">
              🚨 Não perca o evento!
            </h2>
            <p style="margin:0 0 24px;color:#555555;font-size:14px;line-height:1.6;">
              Milhares de produtos, preços de fábrica e as melhores oportunidades de negócio do Norte.<br>
              Salve na sua agenda agora e garanta sua presença.
            </p>

            ${
              calendarLink
                ? `<!-- Botão Google Calendar -->
            <a href="${calendarLink}" target="_blank"
               style="display:inline-block;background:linear-gradient(135deg,#E8196A 0%,#F26522 100%);
                      color:#ffffff;text-decoration:none;padding:15px 32px;border-radius:50px;
                      font-weight:bold;font-size:15px;letter-spacing:0.5px;
                      box-shadow:0 4px 16px rgba(232,25,106,0.35);">
              📅 &nbsp;Salvar no Google Calendar
            </a>
            <br><br>`
                : ''
            }

            <!-- Dica de lembrete -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="background:#ffffff;border-left:4px solid #29ABE2;border-radius:0 10px 10px 0;
                           padding:16px 20px;text-align:left;">
                  <p style="margin:0 0 6px;color:#0f0f2b;font-size:14px;font-weight:bold;">
                    💡 Como ativar lembretes automáticos
                  </p>
                  <p style="margin:0;color:#555555;font-size:13px;line-height:1.6;">
                    Após salvar no Google Calendar, abra o evento e clique em
                    <strong>"Editar"</strong>. Em <strong>"Notificações"</strong>, adicione
                    lembretes para <strong>1 semana antes</strong> e <strong>1 dia antes</strong>
                    para não esquecer!
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── O QUE VOCÊ VAI ENCONTRAR ── -->
        <tr>
          <td style="background-color:#ffffff;padding:36px 30px;">
            <h2 style="margin:0 0 6px;color:#0f0f2b;font-size:18px;font-weight:900;text-align:center;">
              O que te espera na feira
            </h2>
            <p style="margin:0 0 24px;color:#777;font-size:13px;text-align:center;">
              Exclusivo para lojistas e empreendedores
            </p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td width="50%" style="padding:8px 12px 8px 0;vertical-align:top;">
                  <p style="margin:0;color:#333333;font-size:14px;line-height:1.5;">
                    🏠 <strong>Utilidades Domésticas</strong>
                  </p>
                </td>
                <td width="50%" style="padding:8px 0 8px 12px;vertical-align:top;">
                  <p style="margin:0;color:#333333;font-size:14px;line-height:1.5;">
                    🧸 <strong>Brinquedos &amp; Puericultura</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 12px 8px 0;vertical-align:top;">
                  <p style="margin:0;color:#333333;font-size:14px;line-height:1.5;">
                    🎉 <strong>Artigos de Festa</strong>
                  </p>
                </td>
                <td style="padding:8px 0 8px 12px;vertical-align:top;">
                  <p style="margin:0;color:#333333;font-size:14px;line-height:1.5;">
                    🍽️ <strong>Descartáveis</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 12px 8px 0;vertical-align:top;">
                  <p style="margin:0;color:#333333;font-size:14px;line-height:1.5;">
                    🌸 <strong>Decoração</strong>
                  </p>
                </td>
                <td style="padding:8px 0 8px 12px;vertical-align:top;">
                  <p style="margin:0;color:#333333;font-size:14px;line-height:1.5;">
                    🤝 <strong>Networking B2B</strong>
                  </p>
                </td>
              </tr>
            </table>

            <!-- Destaque final -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                   style="margin-top:24px;">
              <tr>
                <td style="background:linear-gradient(135deg,#0f0f2b,#1e1e4e);
                           border-radius:10px;padding:20px;text-align:center;">
                  <p style="margin:0;color:#29ABE2;font-size:11px;letter-spacing:2px;
                            text-transform:uppercase;font-weight:bold;">
                    Compre da fábrica
                  </p>
                  <p style="margin:8px 0 0;color:#ffffff;font-size:16px;font-weight:bold;
                            line-height:1.5;">
                    Renove seu estoque com os melhores preços<br>e fortaleça suas parcerias comerciais.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Faixa tricolor -->
        <tr>
          <td style="padding:0;line-height:0;font-size:0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td width="33%" height="5" style="background-color:#E8196A;"></td>
                <td width="34%" height="5" style="background-color:#29ABE2;"></td>
                <td width="33%" height="5" style="background-color:#F26522;"></td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── FOOTER ── -->
        <tr>
          <td style="background-color:#0f0f2b;padding:32px 30px;text-align:center;">
            <img src="${LOGO_URL}" alt="ExpoMultimix" width="140"
                 style="display:block;margin:0 auto 16px;" />
            <p style="margin:0 0 6px;color:#888888;font-size:12px;">
              A Maior Feira Multissetorial do Norte
            </p>
            <p style="margin:0 0 16px;color:#888888;font-size:12px;">
              ✉️ &nbsp;expomultimix@gmail.com
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
              <tr>
                <td style="padding:0 8px;">
                  <a href="https://www.expomultimix.com.br"
                     style="color:#29ABE2;font-size:12px;text-decoration:none;font-weight:bold;">
                    Site Oficial
                  </a>
                </td>
                <td style="color:#444444;font-size:12px;">|</td>
                <td style="padding:0 8px;">
                  <a href="https://www.instagram.com/expomultimix"
                     style="color:#E8196A;font-size:12px;text-decoration:none;font-weight:bold;">
                    Instagram
                  </a>
                </td>
                <td style="color:#444444;font-size:12px;">|</td>
                <td style="padding:0 8px;">
                  <a href="https://www.facebook.com/expomultimix"
                     style="color:#F26522;font-size:12px;text-decoration:none;font-weight:bold;">
                    Facebook
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:20px 0 0;color:#444444;font-size:11px;line-height:1.7;">
              Você recebeu este e-mail porque se inscreveu na ExpoMultimix.<br>
              Este é um e-mail transacional de confirmação de inscrição.
            </p>
          </td>
        </tr>

      </table>
      <!-- /Card principal -->

    </td>
  </tr>
</table>

</body>
</html>`;
}
