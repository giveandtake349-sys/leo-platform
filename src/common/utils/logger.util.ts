import { createLogger as winstonCreateLogger, format, transports, Logger } from 'winston';

export function createLogger(context: string): Logger {
  return winstonCreateLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      format.printf(
        ({ timestamp, level, message, stack }) =>
          `[${timestamp}] [${context}] ${level.toUpperCase()}: ${stack || message}`,
      ),
    ),
    transports: [new transports.Console()],
  });
}
