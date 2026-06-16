import boss, { JOB_SEND_EMAIL, JOB_POLL_IMAP } from '../lib/queue'
import { handleSendEmail } from './send-handler'
import { handleImapPoll } from './imap-handler'

async function startWorker() {
  console.log('Starting pg-boss worker...')
  
  boss.on('error', (error) => console.error('pg-boss error:', error))

  try {
    await boss.start()
    console.log('pg-boss started successfully')
  } catch (err: any) {
    if (!err.message.includes('already started')) {
      console.error('Failed to start pg-boss', err)
      process.exit(1)
    }
  }

  console.log('Registering worker handlers...')
  await boss.work(JOB_SEND_EMAIL, { teamSize: 5, teamConcurrency: 5 }, handleSendEmail)
  await boss.work(JOB_POLL_IMAP, { teamSize: 2, teamConcurrency: 2 }, handleImapPoll)
  console.log('Handlers registered.')
}

startWorker().catch(err => {
  console.error('Unhandled error in worker process:', err)
  process.exit(1)
})
