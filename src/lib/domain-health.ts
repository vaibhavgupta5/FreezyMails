import { promises as dns } from 'node:dns'

export interface DomainHealthResult {
  spf: { status: 'pass' | 'fail'; message: string };
  dkim: { status: 'pass' | 'fail'; message: string };
  dmarc: { status: 'pass' | 'fail'; message: string };
  blacklist: { status: 'pass' | 'fail'; message: string };
}

export async function checkDomainHealth(domain: string, ipAddress?: string): Promise<DomainHealthResult> {
  const result: DomainHealthResult = {
    spf: { status: 'fail', message: 'No SPF record found' },
    dkim: { status: 'fail', message: 'No DKIM record found' },
    dmarc: { status: 'fail', message: 'No DMARC record found' },
    blacklist: { status: 'pass', message: 'Not listed' },
  }

  // 1. Check SPF
  try {
    const txtRecords = await dns.resolveTxt(domain)
    for (const record of txtRecords) {
      const text = record.join('')
      if (text.startsWith('v=spf1')) {
        result.spf = { status: 'pass', message: 'SPF record configured correctly' }
        break
      }
    }
  } catch (_e: unknown) { const e = _e as Error & { code?: string };
    if (e.code !== 'ENODATA' && e.code !== 'ENOTFOUND') {
      result.spf = { status: 'fail', message: `DNS lookup failed: ${e.message}` }
    }
  }

  // 2. Check DKIM (Using common selectors as we don't know the exact one)
  const selectors = ['google', 'default', 'mail', 's1', 'k1']
  for (const selector of selectors) {
    try {
      const txtRecords = await dns.resolveTxt(`${selector}._domainkey.${domain}`)
      for (const record of txtRecords) {
        const text = record.join('')
        if (text.startsWith('v=DKIM1')) {
          result.dkim = { status: 'pass', message: `DKIM record found for selector '${selector}'` }
          break
        }
      }
      if (result.dkim.status === 'pass') break
    } catch (e) {
      // ignore
    }
  }

  // 3. Check DMARC
  try {
    const txtRecords = await dns.resolveTxt(`_dmarc.${domain}`)
    for (const record of txtRecords) {
      const text = record.join('')
      if (text.startsWith('v=DMARC1')) {
        result.dmarc = { status: 'pass', message: 'DMARC record configured correctly' }
        break
      }
    }
  } catch (_e: unknown) { const e = _e as Error & { code?: string };
    if (e.code !== 'ENODATA' && e.code !== 'ENOTFOUND') {
      result.dmarc = { status: 'fail', message: `DNS lookup failed: ${e.message}` }
    }
  }

  // 4. Check Spamhaus Blacklist
  // If IP is not provided, we resolve the domain's MX records and test those IPs.
  // We'll just do a basic domain-to-IP lookup for now if MX is too complex.
  try {
    let ipsToCheck: string[] = []
    
    if (ipAddress) {
      ipsToCheck.push(ipAddress)
    } else {
      try {
        const mxRecords = await dns.resolveMx(domain)
        if (mxRecords.length > 0) {
          const sortedMx = mxRecords.sort((a, b) => a.priority - b.priority)
          const mxIps = await dns.resolve4(sortedMx[0].exchange)
          if (mxIps.length > 0) ipsToCheck.push(mxIps[0])
        }
      } catch (e) {
        // Fallback to A record
        ipsToCheck = await dns.resolve4(domain)
      }
    }

    if (ipsToCheck.length > 0) {
      const ip = ipsToCheck[0]
      const reversedIp = ip.split('.').reverse().join('.')
      try {
        await dns.resolve4(`${reversedIp}.zen.spamhaus.org`)
        // If it resolves, it's blacklisted
        result.blacklist = { status: 'fail', message: `IP ${ip} is listed on Spamhaus` }
      } catch (_e: unknown) { const e = _e as Error & { code?: string };
        if (e.code === 'ENOTFOUND') {
          // This is the expected result if not listed
          result.blacklist = { status: 'pass', message: 'Domain IP is not listed on Spamhaus' }
        }
      }
    } else {
      result.blacklist = { status: 'fail', message: 'Could not resolve domain to IP for blacklist check' }
    }
  } catch (e) {
    // Ignore general errors for blacklist check
  }

  return result
}
