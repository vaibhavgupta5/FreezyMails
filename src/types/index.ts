export interface CampaignStatRow {
  id: string;
  name: string;
  sent: number;
  opened: number;
  replied: number;
  failed: number;
  openRate: number;
  replyRate: number;
  createdAt: string | Date;
  [key: string]: string | number | Date; // Index signature for sorting
}

export interface ParsedRecipient {
  email: string;
  [key: string]: string;
}

export interface DashboardStatCard {
  label: string;
  value: number | string;
  sub: string;
}
