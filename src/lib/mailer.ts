import nodemailer from 'nodemailer'
import { EmailAccount } from '@prisma/client'
import { decryptString } from './encrypt'

export async function sendEmail(
  account: EmailAccount,
  to: string,
  subject: string,
  html: string,
  trackingPixelUrl?: string
): Promise<any> {
  let transporter
  
  if (account.provider === 'google') {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: account.fromEmail,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: account.refreshToken!,
      },
    })
  } else {
    const decryptedPass = account.smtpPassEncrypted ? decryptString(account.smtpPassEncrypted) : ''
    transporter = nodemailer.createTransport({
      host: account.smtpHost!,
      port: account.smtpPort!,
      secure: account.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: account.smtpUser!,
        pass: decryptedPass,
      },
    })
  }

  let finalHtml = html
  if (trackingPixelUrl) {
    finalHtml += `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;" />`
  }

  return await transporter.sendMail({
    from: `"${account.fromName}" <${account.fromEmail}>`,
    to,
    subject,
    html: finalHtml,
  })
}
