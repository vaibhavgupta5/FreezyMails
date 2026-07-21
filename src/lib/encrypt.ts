import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16


function getKey(): Buffer {
  const key = process.env.SMTP_ENCRYPTION_KEY
  if (!key) {
    throw new Error('SMTP_ENCRYPTION_KEY environment variable is not set')
  }
  return crypto.createHash('sha256').update(key).digest()
}

export function encryptString(plain: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plain, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:ciphertext (all base64)
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

export function decryptString(cipher: string): string {
  const key = getKey()
  const parts = cipher.split(':')

  // Handle legacy crypto-js format (no colons)
  if (parts.length !== 3) {
    throw new Error(
      'Invalid ciphertext format. Re-encrypt credentials with the updated encryption module.'
    )
  }

  const iv = Buffer.from(parts[0], 'base64')
  const authTag = Buffer.from(parts[1], 'base64')
  const encrypted = Buffer.from(parts[2], 'base64')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}
