// Simple Logger for Frontend
// In production, this can easily be extended to send logs to Sentry, Datadog, etc.

const isDev = __DEV__;

export const logger = {
  info: (message: string, ...args: any[]) => {
    if (isDev) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message: string, error?: any, ...args: any[]) => {
    if (isDev) {
      console.error(`[ERROR] ${message}`, error, ...args);
    }
    // TODO: Add Crashlytics / Sentry recording here in prod
  },
  debug: (message: string, ...args: any[]) => {
    if (isDev) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};
