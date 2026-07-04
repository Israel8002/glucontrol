/**
 * Clases de error personalizadas para GluControl.
 * Permiten identificar y manejar errores específicos del dominio.
 */

/** Error base de la aplicación */
export class AppError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  
  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/** Error de base de datos */
export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'DB_ERROR', details);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/** Error de validación */
export class ValidationError extends AppError {
  public readonly field?: string;
  
  constructor(message: string, field?: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
    this.field = field;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/** Error de autenticación / PIN incorrecto */
export class AuthError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTH_ERROR', details);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/** Error de respaldo / exportación */
export class BackupError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'BACKUP_ERROR', details);
    this.name = 'BackupError';
    Object.setPrototypeOf(this, BackupError.prototype);
  }
}

/** Error de notificaciones */
export class NotificationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'NOTIFICATION_ERROR', details);
    this.name = 'NotificationError';
    Object.setPrototypeOf(this, NotificationError.prototype);
  }
}

/** Tipo de resultado que puede ser OK o error */
export type Result<T, E extends Error = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/** Helper para crear resultados OK */
export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

/** Helper para crear resultados de error */
export function err<E extends Error = AppError>(error: E): Result<never, E> {
  return { ok: false, error };
}
