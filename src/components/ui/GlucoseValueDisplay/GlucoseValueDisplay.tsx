import React from 'react';
import type { GlucoseStatus } from '@/types';
import { GLUCOSE_STATUS_COLORS, GLUCOSE_STATUS_LABELS } from '@/core/constants';
import { formatGlucose, TREND_ICONS, type GlucoseTrend } from '@/utils/glucose';
import styles from './GlucoseValueDisplay.module.css';

interface GlucoseValueDisplayProps {
  value: number; // en mg/dL
  status: GlucoseStatus;
  unit: 'mg/dL' | 'mmol/L';
  trend?: GlucoseTrend;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  showUnit?: boolean;
}

/**
 * Display principal del valor de glucosa con color, tendencia y estado.
 * Componente central de la aplicación.
 */
export const GlucoseValueDisplay: React.FC<GlucoseValueDisplayProps> = ({
  value,
  status,
  unit,
  trend,
  size = 'lg',
  showStatus = true,
  showUnit = true,
}) => {
  const color = GLUCOSE_STATUS_COLORS[status];
  const displayValue = formatGlucose(value, unit);
  
  const isAlert = status === 'hypo' || status === 'severe_hypo' || status === 'hyper' || status === 'severe_hyper';
  
  return (
    <div className={`${styles.container} ${styles[`size-${size}`]}`}>
      <div
        className={`${styles.valueRow} ${isAlert ? styles.alert : ''}`}
        style={{ color }}
      >
        <span className={styles.value}>{displayValue}</span>
        {showUnit && <span className={styles.unit}>{unit}</span>}
        {trend && (
          <span className={styles.trend} title={trend.replace('_', ' ')}>
            {TREND_ICONS[trend]}
          </span>
        )}
      </div>
      {showStatus && (
        <div
          className={styles.statusBadge}
          style={{
            color,
            background: `${color}18`,
            borderColor: `${color}30`,
          }}
        >
          {GLUCOSE_STATUS_LABELS[status]}
        </div>
      )}
    </div>
  );
};
