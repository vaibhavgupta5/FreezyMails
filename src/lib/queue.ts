import { PgBoss } from "pg-boss";

const dbUrl = process.env.DATABASE_URL || "";

const boss = new PgBoss({ connectionString: dbUrl });

// Define job names as constants
export const JOB_SEND_EMAIL = 'send-email';
export const JOB_POLL_IMAP = 'poll-imap';
export const JOB_CHECK_HEALTH = 'check-health';
export const JOB_SYNC_GMAIL = 'sync-gmail';

let isStarted = false;

export async function startBoss() {
  if (isStarted) return;
  try {
    await boss.start();
    isStarted = true;
  } catch (_err: unknown) { const err = _err as Error;
    if (err.message.includes('already started')) {
      isStarted = true;
      return;
    }
    throw err;
  }
}

export default boss;
