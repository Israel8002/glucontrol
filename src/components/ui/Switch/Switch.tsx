import React from 'react';
import styles from './Switch.module.css';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
}) => {
  const switchId = id ?? `switch-${Math.random().toString(36).slice(2)}`;
  
  return (
    <div className={`${styles.container} ${disabled ? styles.disabled : ''}`}>
      {(label || description) && (
        <div className={styles.labelGroup}>
          {label && <label htmlFor={switchId} className={styles.label}>{label}</label>}
          {description && <span className={styles.description}>{description}</span>}
        </div>
      )}
      <button
        id={switchId}
        role="switch"
        aria-checked={checked}
        className={`${styles.track} ${checked ? styles.checked : ''}`}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        type="button"
      >
        <span className={styles.thumb} />
      </button>
    </div>
  );
};
