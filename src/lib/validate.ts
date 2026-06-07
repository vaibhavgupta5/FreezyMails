export function validateRecipientList(recipients: Array<{email: string, [k: string]: string}>, variables: string[]): { valid: boolean, errors: Record<number, string[]> } {
  let valid = true
  const errors: Record<number, string[]> = {}
  
  if (recipients.length > 500) {
    valid = false
    errors[-1] = ['Max 500 recipients per campaign allowed.']
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const seenEmails = new Map<string, number[]>()

  recipients.forEach((row, idx) => {
    const rowErrors: string[] = []
    
    // 1. Email presence and format
    if (!row.email) {
      rowErrors.push('Missing email address.')
    } else if (!emailRegex.test(row.email)) {
      rowErrors.push(`Invalid email format: ${row.email}`)
    } else {
      const existing = seenEmails.get(row.email) || []
      existing.push(idx)
      seenEmails.set(row.email, existing)
    }

    // 2. Missing variables
    variables.forEach(v => {
      if (!row[v] || row[v].trim() === '') {
        rowErrors.push(`Missing variable: ${v}`)
      }
    })

    if (rowErrors.length > 0) {
      valid = false
      errors[idx] = rowErrors
    }
  })

  // 3. Mark duplicate pairs
  seenEmails.forEach((indices, email) => {
    if (indices.length > 1) {
      valid = false
      indices.forEach(idx => {
        if (!errors[idx]) errors[idx] = []
        errors[idx].push(`Duplicate email found: ${email}`)
      })
    }
  })

  return { valid, errors }
}
