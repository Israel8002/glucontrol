import type { GlucoseStatus } from '@/types';
import type { GlucoseStats, GlucoseReading, GlucoseChartPoint } from '@/entities';
import { MGDL_TO_MMOL, HBA1C_FORMULA } from '@/core/constants';

export interface GlucoseThresholds {
  targetMin: number;
  targetMax: number;
  hypoThreshold: number;
  hyperThreshold: number;
  severeHypoThreshold: number;
  severeHyperThreshold: number;
}

/**
 * Determina el estado clínico de una lectura de glucosa.
 * Todos los valores deben estar en mg/dL.
 */
export function determineGlucoseStatus(
  valueMgdl: number,
  thresholds: GlucoseThresholds
): GlucoseStatus {
  if (valueMgdl < thresholds.severeHypoThreshold) return 'severe_hypo';
  if (valueMgdl < thresholds.hypoThreshold) return 'hypo';
  if (valueMgdl < thresholds.targetMin) return 'low';
  if (valueMgdl <= thresholds.targetMax) return 'normal';
  if (valueMgdl <= thresholds.hyperThreshold) return 'high';
  if (valueMgdl < thresholds.severeHyperThreshold) return 'hyper';
  return 'severe_hyper';
}

/**
 * Convierte mg/dL a mmol/L
 */
export function mgdlToMmol(mgdl: number): number {
  return Math.round(mgdl * MGDL_TO_MMOL * 10) / 10;
}

/**
 * Convierte mmol/L a mg/dL
 */
export function mmolToMgdl(mmol: number): number {
  return Math.round(mmol * 18.018);
}

/**
 * Formatea un valor de glucosa según la unidad seleccionada
 */
export function formatGlucose(valueMgdl: number, unit: 'mg/dL' | 'mmol/L'): string {
  if (unit === 'mmol/L') {
    return mgdlToMmol(valueMgdl).toFixed(1);
  }
  return valueMgdl.toString();
}

/**
 * Calcula estadísticas completas de una lista de lecturas de glucosa.
 * Todas las lecturas deben estar en mg/dL.
 */
export function calculateGlucoseStats(
  readings: GlucoseReading[],
  thresholds: GlucoseThresholds,
  period: string = ''
): GlucoseStats {
  if (readings.length === 0) {
    return {
      average: 0, min: 0, max: 0, standardDeviation: 0,
      coefficientOfVariation: 0, estimatedHbA1c: 0,
      timeInRange: 0, timeInHypo: 0, timeInSevereHypo: 0,
      timeInHyper: 0, timeInSevereHyper: 0,
      totalReadings: 0, readingsPerDay: 0,
      hypoCount: 0, hyperCount: 0, period,
    };
  }
  
  const values = readings.map(r => r.value);
  const total = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / total;
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  // Desviación estándar
  const variance = values.reduce((acc, v) => acc + Math.pow(v - average, 2), 0) / total;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = average > 0 ? (standardDeviation / average) * 100 : 0;
  
  // HbA1c estimada
  const estimatedHbA1c = (average + HBA1C_FORMULA.OFFSET) / HBA1C_FORMULA.DIVISOR;
  
  // Tiempo en rango (como porcentaje del total de lecturas)
  const inRange = values.filter(v => v >= thresholds.targetMin && v <= thresholds.targetMax).length;
  const inHypo = values.filter(v => v < thresholds.hypoThreshold && v >= thresholds.severeHypoThreshold).length;
  const inSevereHypo = values.filter(v => v < thresholds.severeHypoThreshold).length;
  const inHyper = values.filter(v => v > thresholds.targetMax && v < thresholds.severeHyperThreshold).length;
  const inSevereHyper = values.filter(v => v >= thresholds.severeHyperThreshold).length;
  
  const timeInRange = (inRange / total) * 100;
  const timeInHypo = (inHypo / total) * 100;
  const timeInSevereHypo = (inSevereHypo / total) * 100;
  const timeInHyper = (inHyper / total) * 100;
  const timeInSevereHyper = (inSevereHyper / total) * 100;
  
  // Conteos de hipoglucemias/hiperglucemias
  const hypoCount = inHypo + inSevereHypo;
  const hyperCount = inHyper + inSevereHyper;
  
  // Lecturas por día (aproximado)
  const dates = new Set(readings.map(r => r.readingDate));
  const readingsPerDay = total / Math.max(dates.size, 1);
  
  return {
    average: Math.round(average),
    min,
    max,
    standardDeviation: Math.round(standardDeviation * 10) / 10,
    coefficientOfVariation: Math.round(coefficientOfVariation * 10) / 10,
    estimatedHbA1c: Math.round(estimatedHbA1c * 10) / 10,
    timeInRange: Math.round(timeInRange * 10) / 10,
    timeInHypo: Math.round(timeInHypo * 10) / 10,
    timeInSevereHypo: Math.round(timeInSevereHypo * 10) / 10,
    timeInHyper: Math.round(timeInHyper * 10) / 10,
    timeInSevereHyper: Math.round(timeInSevereHyper * 10) / 10,
    totalReadings: total,
    readingsPerDay: Math.round(readingsPerDay * 10) / 10,
    hypoCount,
    hyperCount,
    period,
  };
}

/**
 * Convierte lecturas de glucosa a puntos de gráfica
 */
export function readingsToChartPoints(readings: GlucoseReading[]): GlucoseChartPoint[] {
  return readings
    .filter(r => !r.isDeleted)
    .map(r => ({
      timestamp: r.timestamp,
      date: r.readingDate,
      time: r.readingTime,
      value: r.value,
      status: r.status,
      context: r.context,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Color de fondo para un valor de glucosa (para badges/chips)
 */
export function getGlucoseStatusColor(status: GlucoseStatus): string {
  const colors: Record<GlucoseStatus, string> = {
    severe_hypo: '#dc2626',
    hypo: '#ef4444',
    low: '#f59e0b',
    normal: '#22c55e',
    high: '#f59e0b',
    hyper: '#ef4444',
    severe_hyper: '#dc2626',
  };
  return colors[status];
}

/**
 * Tendencia de glucosa (comparando últimas lecturas)
 */
export type GlucoseTrend = 'rising_fast' | 'rising' | 'stable' | 'falling' | 'falling_fast';

export function calculateTrend(readings: GlucoseReading[]): GlucoseTrend {
  if (readings.length < 2) return 'stable';
  
  // Ordenar por timestamp ascendente
  const sorted = [...readings].sort((a, b) => a.timestamp - b.timestamp);
  const recent = sorted.slice(-3); // Últimas 3 lecturas
  
  if (recent.length < 2) return 'stable';
  
  const last = recent[recent.length - 1];
  const prev = recent[recent.length - 2];
  const diff = last.value - prev.value;
  
  if (diff > 40) return 'rising_fast';
  if (diff > 15) return 'rising';
  if (diff < -40) return 'falling_fast';
  if (diff < -15) return 'falling';
  return 'stable';
}

export const TREND_ICONS: Record<GlucoseTrend, string> = {
  rising_fast: '↑↑',
  rising: '↑',
  stable: '→',
  falling: '↓',
  falling_fast: '↓↓',
};

/**
 * Color para el estado de glucosa (acepta string para uso en calendario)
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    severe_hypo: '#dc2626',
    hypo: '#ef4444',
    low: '#f59e0b',
    normal: '#22c55e',
    high: '#f59e0b',
    hyper: '#ef4444',
    severe_hyper: '#dc2626',
  };
  return colors[status] ?? '#6b7280';
}
