import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  showBack = true,
  rightAction,
}) => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };
  
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {showBack && (
          <button
            className={styles.backBtn}
            onClick={handleBack}
            aria-label="Volver"
          >
            <ChevronLeft size={24} />
          </button>
        )}
      </div>
      <div className={styles.center}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
      <div className={styles.right}>
        {rightAction}
      </div>
    </header>
  );
};
