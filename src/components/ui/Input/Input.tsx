import React from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * Input accesible con soporte para label, error, hint e iconos.
 * Optimizado para uso en móviles con touch target mínimo.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  rightAction,
  fullWidth = true,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2)}`;
  
  return (
    <div className={`${styles.wrapper} ${fullWidth ? styles.fullWidth : ''}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {props.required && <span className={styles.required}> *</span>}
        </label>
      )}
      <div className={`${styles.inputContainer} ${error ? styles.hasError : ''}`}>
        {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          className={`${styles.input} ${leftIcon ? styles.withLeftIcon : ''} ${rightIcon || rightAction ? styles.withRightIcon : ''} ${className}`}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
        {rightAction && <span className={styles.rightAction}>{rightAction}</span>}
      </div>
      {error && (
        <span id={`${inputId}-error`} className={styles.error} role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${inputId}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
