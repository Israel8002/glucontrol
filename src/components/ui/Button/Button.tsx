import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Botón principal de la aplicación.
 * Tamaño mínimo de toque 48×48px para accesibilidad móvil.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...props
}, ref) => {
  const isDisabled = disabled || loading;
  
  const classes = [
    styles.btn,
    styles[`btn-${variant}`],
    styles[`btn-${size}`],
    fullWidth ? styles.fullWidth : '',
    isDisabled ? styles.disabled : '',
    className,
  ].filter(Boolean).join(' ');
  
  return (
    <button
      ref={ref}
      className={classes}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Loader2 className={styles.spinner} size={size === 'sm' ? 14 : size === 'lg' || size === 'xl' ? 20 : 16} />
      ) : leftIcon ? (
        <span className={styles.icon}>{leftIcon}</span>
      ) : null}
      <span className={styles.label}>{children}</span>
      {!loading && rightIcon && (
        <span className={styles.icon}>{rightIcon}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';
