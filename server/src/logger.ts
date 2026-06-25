import fs from 'fs';
import path from 'path';

enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

class Logger {
  private logFile: string;

  constructor() {
    // Write logs to a file inside the server directory
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.logFile = path.join(logDir, 'server.log');
  }

  private formatMessage(level: LogLevel, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  private write(level: LogLevel, message: string, context?: any) {
    const formatted = this.formatMessage(level, message, context);
    // Console log
    if (level === LogLevel.ERROR) {
      console.error(`❌ ${formatted}`);
    } else if (level === LogLevel.WARN) {
      console.warn(`⚠️ ${formatted}`);
    } else {
      console.log(`✨ ${formatted}`);
    }

    // Append to file
    try {
      fs.appendFileSync(this.logFile, formatted + '\n', 'utf8');
    } catch (err) {
      console.error('Failed to write log to file', err);
    }
  }

  info(message: string, context?: any) {
    this.write(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: any) {
    this.write(LogLevel.WARN, message, context);
  }

  error(message: string, context?: any) {
    this.write(LogLevel.ERROR, message, context);
  }

  debug(message: string, context?: any) {
    this.write(LogLevel.DEBUG, message, context);
  }
}

export const logger = new Logger();
