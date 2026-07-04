import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  glow?: 'green' | 'red' | 'yellow' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  id?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  glow = 'none',
  padding = 'md',
  id,
}) => {
  const classes = [
    styles.card,
    glow !== 'none' ? styles[`glow-${glow}`] : '',
    styles[`pad-${padding}`],
    onClick ? styles.clickable : '',
    className,
  ].filter(Boolean).join(' ');
  
  return (
    <div
      id={id}
      className={classes}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  );
};

interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardSectionProps> = ({ children, className = '' }) => (
  <div className={`${styles.cardHeader} ${className}`}>{children}</div>
);

export const CardBody: React.FC<CardSectionProps> = ({ children, className = '' }) => (
  <div className={`${styles.cardBody} ${className}`}>{children}</div>
);

export const CardFooter: React.FC<CardSectionProps> = ({ children, className = '' }) => (
  <div className={`${styles.cardFooter} ${className}`}>{children}</div>
);
