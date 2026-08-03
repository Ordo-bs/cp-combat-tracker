export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export class ConsoleLogger implements ILogger {
  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(`[CP Combat Tracker] ${message}`, context ?? "");
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.info(`[CP Combat Tracker] ${message}`, context ?? "");
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[CP Combat Tracker] ${message}`, context ?? "");
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(`[CP Combat Tracker] ${message}`, context ?? "");
  }
}
