import React, { useState, useEffect } from 'react';
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
 * Permite la escritura directa mediante el teclado sin bloqueos durante la edición.
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
  const [inputValue, setInputValue] = useState<string>(
    decimals > 0 ? value.toFixed(decimals) : String(value)
  );

  useEffect(() => {
    const currentParsed = parseFloat(inputValue);
    if (currentParsed !== value || isNaN(currentParsed)) {
      setInputValue(decimals > 0 ? value.toFixed(decimals) : String(value));
    }
  }, [value, decimals]);

  const increment = () => {
    const next = Math.min(max, Math.round((value + step) * 10) / 10);
    onChange(next);
  };
  
  const decrement = () => {
    const next = Math.max(min, Math.round((value - step) * 10) / 10);
    onChange(next);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawString = e.target.value;
    setInputValue(rawString);

    const parsed = parseFloat(rawString);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    let parsed = parseFloat(inputValue);
    if (isNaN(parsed)) {
      parsed = value; // fallback al valor actual en caso de estar vacío
    }
    
    // Validar límites y redondear según decimales
    const clamped = Math.min(max, Math.max(min, parsed));
    const rounded = Math.round(clamped * Math.pow(10, decimals)) / Math.pow(10, decimals);
    
    onChange(rounded);
    setInputValue(decimals > 0 ? rounded.toFixed(decimals) : String(rounded));
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
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
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
