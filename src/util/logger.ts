export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/** Production logger: errors and warnings only. Debug/info are no-ops. */
export class ConsoleLogger implements ILogger {
  debug(_message: string, _context?: Record<string, unknown>): void {
    // Intentionally empty: shipped plugins should not log debug noise.
  }

  info(_message: string, _context?: Record<string, unknown>): void {
    // Intentionally empty: shipped plugins should not log info noise.
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[CP Combat Tracker] ${message}`, context ?? "");
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(`[CP Combat Tracker] ${message}`, context ?? "");
  }
}
