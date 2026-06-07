import { PgBoss } from "pg-boss";

const dbUrl = process.env.DATABASE_URL || "";

const boss = new PgBoss({ connectionString: dbUrl });

// Define job names as constants
export const JOB_SEND_EMAIL = "SEND_EMAIL";
export const JOB_POLL_IMAP = "POLL_IMAP";

export default boss;
