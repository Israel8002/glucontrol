import React from 'react';
import styles from './NumberInput.module.css';
import { Plus, Minus } from 'lucide-react';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  decimals?: number;
  large?: boolean;
}

/**
 * Input numérico con botones +/- para uso en móviles.
 * Los botones grandes facilitan el uso para personas mayores.
 */
export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  label,
  unit,
  decimals = 0,
  large = false,
}) => {
  const increment = () => {
    const next = Math.min(max, Math.round((value + step) * 10) / 10);
    onChange(next);
  };
  
  const decrement = () => {
    const next = Math.max(min, Math.round((value - step) * 10) / 10);
    onChange(next);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    if (!isNaN(raw) && raw >= min && raw <= max) {
      onChange(raw);
    } else if (e.target.value === '' || e.target.value === '-') {
      // permitir vacío temporal
    }
  };
  
  return (
    <div className={`${styles.container} ${large ? styles.large : ''}`}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.inputRow}>
        <button
          type="button"
          className={styles.btn}
          onClick={decrement}
          disabled={value <= min}
          aria-label="Disminuir"
        >
          <Minus size={large ? 24 : 18} />
        </button>
        <div className={styles.valueContainer}>
          <input
            type="number"
            className={styles.input}
            value={decimals > 0 ? value.toFixed(decimals) : value}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            inputMode="decimal"
          />
          {unit && <span className={styles.unit}>{unit}</span>}
        </div>
        <button
          type="button"
          className={styles.btn}
          onClick={increment}
          disabled={value >= max}
          aria-label="Aumentar"
        >
          <Plus size={large ? 24 : 18} />
        </button>
      </div>
    </div>
  );
};
