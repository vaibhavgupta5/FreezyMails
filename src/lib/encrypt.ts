import CryptoJS from 'crypto-js'

export function encryptString(plain: string): string {
  const key = process.env.SMTP_ENCRYPTION_KEY || ''
  return CryptoJS.AES.encrypt(plain, key).toString()
}

export function decryptString(cipher: string): string {
  const key = process.env.SMTP_ENCRYPTION_KEY || ''
  const bytes = CryptoJS.AES.decrypt(cipher, key)
  return bytes.toString(CryptoJS.enc.Utf8)
}
