/**
 * Sistema de logging centralizado para GluControl.
 * En producción solo registra errores críticos.
 * En desarrollo registra todos los niveles.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
  module?: string;
}

const isDev = import.meta.env.DEV;
const LOG_MAX_ENTRIES = 500;
const LOG_STORAGE_KEY = 'glucontrol_logs';

class Logger {
  private entries: LogEntry[] = [];
  
  private log(level: LogLevel, message: string, data?: unknown, module?: string): void {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      module,
    };
    
    this.entries.push(entry);
    
    // Mantener límite de entradas en memoria
    if (this.entries.length > LOG_MAX_ENTRIES) {
      this.entries = this.entries.slice(-LOG_MAX_ENTRIES);
    }
    
    // Consola solo en desarrollo o errores críticos
    if (isDev || level === 'error') {
      const prefix = `[GluControl${module ? `::${module}` : ''}]`;
      switch (level) {
        case 'debug':
          if (isDev) console.debug(prefix, message, data ?? '');
          break;
        case 'info':
          if (isDev) console.info(prefix, message, data ?? '');
          break;
        case 'warn':
          console.warn(prefix, message, data ?? '');
          break;
        case 'error':
          console.error(prefix, message, data ?? '');
          // Persistir errores críticos en localStorage
          this.persistError(entry);
          break;
      }
    }
  }
  
  private persistError(entry: LogEntry): void {
    try {
      const stored = localStorage.getItem(LOG_STORAGE_KEY);
      const existing: LogEntry[] = stored ? JSON.parse(stored) : [];
      existing.push(entry);
      const trimmed = existing.slice(-100); // últimos 100 errores
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // No hacer nada si localStorage no está disponible
    }
  }
  
  debug(message: string, data?: unknown, module?: string): void {
    this.log('debug', message, data, module);
  }
  
  info(message: string, data?: unknown, module?: string): void {
    this.log('info', message, data, module);
  }
  
  warn(message: string, data?: unknown, module?: string): void {
    this.log('warn', message, data, module);
  }
  
  error(message: string, data?: unknown, module?: string): void {
    this.log('error', message, data, module);
  }
  
  /** Obtener todas las entradas de log en memoria */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }
  
  /** Obtener errores persistidos en localStorage */
  getPersistedErrors(): LogEntry[] {
    try {
      const stored = localStorage.getItem(LOG_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  /** Limpiar logs */
  clear(): void {
    this.entries = [];
    try {
      localStorage.removeItem(LOG_STORAGE_KEY);
    } catch {
      // Ignorar
    }
  }
  
  /** Logger con módulo prefijado */
  forModule(module: string): ModuleLogger {
    return new ModuleLogger(this, module);
  }
}

class ModuleLogger {
  constructor(private logger: Logger, private module: string) {}
  
  debug(message: string, data?: unknown): void {
    this.logger.debug(message, data, this.module);
  }
  
  info(message: string, data?: unknown): void {
    this.logger.info(message, data, this.module);
  }
  
  warn(message: string, data?: unknown): void {
    this.logger.warn(message, data, this.module);
  }
  
  error(message: string, data?: unknown): void {
    this.logger.error(message, data, this.module);
  }
}

// Singleton
export const logger = new Logger();
export default logger;
