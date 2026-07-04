import React from 'react';
import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color,
  className = '',
}) => (
  <div
    className={`${styles.spinner} ${styles[size]} ${className}`}
    style={color ? { borderTopColor: color } : undefined}
    role="status"
    aria-label="Cargando..."
  />
);
