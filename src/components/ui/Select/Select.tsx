import React from 'react';
import styles from './Select.module.css';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  hint,
  options,
  placeholder,
  fullWidth = true,
  id,
  className = '',
  ...props
}, ref) => {
  const selectId = id ?? `select-${Math.random().toString(36).slice(2)}`;
  
  return (
    <div className={`${styles.wrapper} ${fullWidth ? styles.fullWidth : ''}`}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
          {props.required && <span className={styles.required}> *</span>}
        </label>
      )}
      <div className={`${styles.selectContainer} ${error ? styles.hasError : ''}`}>
        <select
          ref={ref}
          id={selectId}
          className={`${styles.select} ${className}`}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className={styles.chevron} size={18} />
      </div>
      {error && <span className={styles.error} role="alert">{error}</span>}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
    </div>
  );
});

Select.displayName = 'Select';
