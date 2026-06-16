import nodemailer from 'nodemailer'
import { EmailAccount } from '@prisma/client'
import { decryptString } from './encrypt'
import { OAuth2Client } from 'google-auth-library'
import MailComposer from 'nodemailer/lib/mail-composer'

export async function sendEmail(
  account: EmailAccount,
  to: string,
  subject: string,
  html: string,
  trackingPixelUrl?: string
): Promise<{ messageId: string }> {
  let finalHtml = html
  if (trackingPixelUrl) {
    finalHtml += `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;" />`
  }

  if (account.provider === 'google') {
    // Use Gmail HTTP API to bypass Render's strict outbound SMTP port blocking
    
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: account.refreshToken! });

    const mailOptions = {
      from: `"${account.fromName}" <${account.fromEmail}>`,
      to,
      subject,
      html: finalHtml,
    };
    
    const mail = new MailComposer(mailOptions);
    const message = await mail.compile().build();
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = await oauth2Client.request({
      url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { raw: encodedMessage }
    });

    return { messageId: (res.data as unknown as {id: string}).id };  } else {
    // Use standard SMTP for other providers
    const decryptedPass = account.smtpPassEncrypted ? decryptString(account.smtpPassEncrypted) : ''
    const transporter = nodemailer.createTransport({
      host: account.smtpHost!,
      port: account.smtpPort!,
      secure: account.smtpPort === 465,
      auth: {
        user: account.smtpUser!,
        pass: decryptedPass,
      },
    });

    return await transporter.sendMail({
      from: `"${account.fromName}" <${account.fromEmail}>`,
      to,
      subject,
      html: finalHtml,
    });
  }
}
