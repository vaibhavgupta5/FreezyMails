import nodemailer from 'nodemailer'
import { EmailAccount } from '@prisma/client'
import { decryptString } from './encrypt'
import { OAuth2Client } from 'google-auth-library'
import MailComposer from 'nodemailer/lib/mail-composer'
import crypto from 'crypto'

export async function sendEmail(
  account: EmailAccount,
  to: string,
  subject: string,
  html: string,
  trackingPixelUrl?: string,
  attachments?: { filename: string; content: string; encoding?: string }[]
): Promise<{ messageId: string }> {
  let finalHtml = html
  if (trackingPixelUrl) {
    finalHtml += `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;" />`
  }

  const formattedAttachments = attachments?.map((att) => ({
    filename: att.filename,
    content: att.content,
    encoding: 'base64',
  }))

  if (account.provider === 'google') {
    // Use Gmail HTTP API to bypass Render's strict outbound SMTP port blocking
    
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    const decryptedRefresh = decryptString(account.refreshToken!);
    oauth2Client.setCredentials({ refresh_token: decryptedRefresh });

    const domain = account.fromEmail.split('@')[1] || 'gmail.com';
    const customMessageId = `<${crypto.randomUUID()}@${domain}>`;

    const mailOptions = {
      from: `"${account.fromName}" <${account.fromEmail}>`,
      to,
      subject,
      html: finalHtml,
      messageId: customMessageId,
      attachments: formattedAttachments,
    };
    
    const mail = new MailComposer(mailOptions);
    const message = await mail.compile().build();
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    try {
      await oauth2Client.request({
        url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: { raw: encodedMessage }
      });
      return { messageId: customMessageId };
    } catch (_err: unknown) {
      const err = _err as {
        message?: string;
        response?: { data?: { error?: string; error_description?: string } };
      };
      if (
        err.message === 'invalid_grant' ||
        err.response?.data?.error === 'invalid_grant' ||
        err.response?.data?.error_description?.includes('Token has been expired or revoked')
      ) {
        const prisma = (await import('./prisma')).default;
        await prisma.emailAccount.update({ where: { id: account.id }, data: { isActive: false } });
        throw new Error(`The email account ${account.fromEmail} has disconnected. Please reconnect it in the accounts tab.`);
      }
      throw _err;
    }
  } else {
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
      attachments: formattedAttachments,
    });
  }
}
