export type AuthStatus = 'unauthenticated' | 'pending_code' | 'pending_2fa' | 'authenticated';
export type JobType = 'checkin' | 'embywatch';
export type LogStatus = 'success' | 'failed' | 'running';

export type TgAccount = {
  id: number;
  name: string;
  phoneNumber: string;
  apiId: number;
  apiHash: string;
  sessionString: string | null;
  authStatus: AuthStatus;
  createdAt: string;
};

export type Job = {
  id: number;
  name: string;
  /** null for embywatch jobs that don't require a Telegram account */
  accountId: number | null;
  jobType: JobType;
  /** checkin: Telegram bot username. embywatch: Emby server URL */
  botUsername: string;
  scheduleWindowStart: number;
  scheduleWindowEnd: number;
  timezone: string;
  replyTimeoutMs: number;
  retryMax: number;
  enabled: boolean;
  createdAt: string;
  config: string | null;
  startCommand: string;
  checkinButton: string;
};

export type EmbywatchConfig = {
  username: string;
  password: string;
  playDuration?: number;
  userAgent?: string;
};

export type JobLog = {
  id: number;
  jobId: number;
  jobName: string | null;
  accountName: string | null;
  ranAt: string;
  status: LogStatus;
  message: string | null;
};
