import dns from 'node:dns'
dns.setDefaultResultOrder('ipv4first')

import https from 'node:https'
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { setGlobalDispatcher, Agent } = require('undici')
  // Option A: Force IPv4 for Node 18+ native fetch / gaxios
  setGlobalDispatcher(new Agent({ connect: { family: 4 } }))
} catch (e) {
  console.log('undici not found, skipping global dispatcher patch')
}

// Option B: Force IPv4 for legacy https requests
const originalLookup = dns.lookup;
https.globalAgent.options.lookup = (hostname: string, options, callback) => {
  return originalLookup(hostname, { ...options, family: 4 }, callback);
};

console.log('dns order:', dns.getDefaultResultOrder()); // should print 'ipv4first'

import http from 'http'
import boss, { JOB_SEND_EMAIL, JOB_POLL_IMAP } from '../lib/queue'
import { handleSendEmail } from './send-handler'
import { handleImapPoll } from './imap-handler'

async function startWorker() {
  console.log('Starting pg-boss worker...')
  
  boss.on('error', (error) => console.error('pg-boss error:', error))

  try {
    await boss.start()
    console.log('pg-boss started successfully')
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (!err.message.includes('already started')) {
        console.error('Failed to start pg-boss', err)
        process.exit(1)
      }
    } else {
      console.error('Failed to start pg-boss', err)
      process.exit(1)
    }
  }

  console.log('Registering worker handlers...')
  await boss.createQueue(JOB_SEND_EMAIL)
  await boss.createQueue(JOB_POLL_IMAP)
  
  await boss.work(JOB_SEND_EMAIL, { localConcurrency: 5 }, handleSendEmail)
  await boss.work(JOB_POLL_IMAP, { localConcurrency: 2 }, handleImapPoll)
  console.log('Handlers registered.')

  const port = process.env.PORT || 8080
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Worker is running')
  })
  
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, running worker without HTTP server...`)
    } else {
      console.error('HTTP server error:', err)
    }
  })

  server.listen(port, () => {
    console.log(`Dummy HTTP server listening on port ${port}`)
  })
}

startWorker().catch(err => {
  console.error('Unhandled error in worker process:', err)
  process.exit(1)
})
