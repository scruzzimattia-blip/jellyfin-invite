import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const SMTP_FROM = process.env.SMTP_FROM ?? '"Jellyfin Invite" <invite@example.com>';

// Nodemailer Transporter konfigurieren
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true fuer 465, false fuer andere Ports
  auth: SMTP_USER && SMTP_PASS ? {
    user: SMTP_USER,
    pass: SMTP_PASS
  } : undefined
});

export interface SendInvitationParams {
  to: string;
  inviteUrl: string;
  inviterName: string;
  expiresAt: Date;
  note?: string;
}

export async function sendInvitationEmail(params: SendInvitationParams): Promise<void> {
  const { to, inviteUrl, inviterName, expiresAt, note } = params;

  // Datum formatieren
  const expiresString = expiresAt.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Einladung zu Jellyfin</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #f4f5f7;
          color: #333333;
          line-height: 1.6;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #00a4dc; /* Jellyfin-Blau/Lila-Akzent */
          color: #ffffff;
          padding: 20px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 30px;
        }
        .button {
          display: inline-block;
          background-color: #aa5cc3; /* Jellyfin-Lila */
          color: #ffffff;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 4px;
          font-weight: bold;
          margin: 20px 0;
        }
        .footer {
          background-color: #f4f5f7;
          padding: 15px 30px;
          text-align: center;
          font-size: 12px;
          color: #888888;
          border-top: 1px solid #eeeeee;
        }
        .note {
          background-color: #f9f9f9;
          border-left: 4px solid #aa5cc3;
          padding: 10px 15px;
          margin: 20px 0;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Du wurdest eingeladen!</h1>
        </div>
        <div class="content">
          <p>Hallo,</p>
          <p><strong>${inviterName}</strong> hat dich eingeladen, einem Jellyfin-Server beizutreten.</p>
          
          ${note ? `<div class="note"><strong>Notiz:</strong><br>${note}</div>` : ""}
          
          <p>Klicke auf den folgenden Button, um dir einen Account zu erstellen und sofort loszulegen:</p>
          
          <center>
            <a href="${inviteUrl}" class="button" target="_blank">Einladung annehmen</a>
          </center>
          
          <p><em>Dieser Link ist gueltig bis zum ${expiresString}.</em></p>
          
          <p>Wenn der Button nicht funktioniert, kannst du auch folgenden Link in deinen Browser kopieren:</p>
          <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        </div>
        <div class="footer">
          Diese E-Mail wurde automatisch generiert von Jellyfin Invite.
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hallo,

${inviterName} hat dich eingeladen, einem Jellyfin-Server beizutreten.

${note ? `Notiz:\n${note}\n\n` : ""}
Um die Einladung anzunehmen und dir einen Account zu erstellen, rufe bitte folgenden Link auf:
${inviteUrl}

Dieser Link ist gueltig bis zum ${expiresString}.
  `.trim();

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject: `Einladung von ${inviterName} zu Jellyfin`,
    text,
    html
  });
}
