import React from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'muted' | 'primary';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'muted',
  size = 'md',
  className = '',
}) => (
  <span className={`${styles.badge} ${styles[variant]} ${styles[size]} ${className}`}>
    {children}
  </span>
);
