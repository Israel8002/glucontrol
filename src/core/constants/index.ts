import type { GlucoseStatus, BloodPressureCategory, BMICategory, ExerciseIntensity, ExerciseType } from '@/types';

/**
 * Rangos clínicos y constantes de la aplicación
 */

// ─── Glucosa (mg/dL) ────────────────────────────────────────────────────────
export const GLUCOSE_RANGES = {
  SEVERE_HYPO_MAX: 54,
  HYPO_MAX: 70,
  LOW_MAX: 80,
  DEFAULT_TARGET_MIN: 80,
  DEFAULT_TARGET_MAX: 180,
  HYPER_MIN: 250,
  SEVERE_HYPER_MIN: 400,
} as const;

export const GLUCOSE_STATUS_LABELS: Record<GlucoseStatus, string> = {
  severe_hypo: 'Hipoglucemia severa',
  hypo: 'Hipoglucemia',
  low: 'Glucosa baja',
  normal: 'En rango',
  high: 'Glucosa alta',
  hyper: 'Hiperglucemia',
  severe_hyper: 'Hiperglucemia severa',
};

export const GLUCOSE_STATUS_COLORS: Record<GlucoseStatus, string> = {
  severe_hypo: '#ef4444',   // rojo intenso
  hypo: '#ef4444',           // rojo
  low: '#f59e0b',            // amarillo
  normal: '#22c55e',         // verde
  high: '#f59e0b',           // amarillo
  hyper: '#ef4444',          // rojo
  severe_hyper: '#dc2626',   // rojo oscuro
};

// Factor de conversión mg/dL ↔ mmol/L
export const MGDL_TO_MMOL = 0.0555;
export const MMOL_TO_MGDL = 18.018;

// ─── Presión Arterial (mmHg) ─────────────────────────────────────────────────
export const BLOOD_PRESSURE_CATEGORIES: Record<BloodPressureCategory, { label: string; color: string }> = {
  normal: { label: 'Normal', color: '#22c55e' },
  elevated: { label: 'Elevada', color: '#f59e0b' },
  stage1: { label: 'Hipertensión Estadio 1', color: '#f97316' },
  stage2: { label: 'Hipertensión Estadio 2', color: '#ef4444' },
  crisis: { label: 'Crisis Hipertensiva', color: '#dc2626' },
};

// ─── IMC ─────────────────────────────────────────────────────────────────────
export const BMI_CATEGORIES: Record<BMICategory, { label: string; color: string; min: number; max: number }> = {
  underweight: { label: 'Bajo peso', color: '#f59e0b', min: 0, max: 18.49 },
  normal: { label: 'Peso normal', color: '#22c55e', min: 18.5, max: 24.99 },
  overweight: { label: 'Sobrepeso', color: '#f59e0b', min: 25, max: 29.99 },
  obese_1: { label: 'Obesidad grado I', color: '#f97316', min: 30, max: 34.99 },
  obese_2: { label: 'Obesidad grado II', color: '#ef4444', min: 35, max: 39.99 },
  obese_3: { label: 'Obesidad grado III', color: '#dc2626', min: 40, max: Infinity },
};

// ─── Ejercicio ───────────────────────────────────────────────────────────────
export const EXERCISE_TYPES: Record<ExerciseType, string> = {
  walking: 'Caminar',
  running: 'Correr',
  cycling: 'Ciclismo',
  swimming: 'Natación',
  weights: 'Pesas',
  yoga: 'Yoga',
  dancing: 'Baile',
  sports: 'Deportes',
  other: 'Otro',
};

export const EXERCISE_INTENSITY_LABELS: Record<ExerciseIntensity, string> = {
  light: 'Leve',
  moderate: 'Moderada',
  intense: 'Intensa',
};

// MET (Metabolic Equivalent of Task) aproximado por tipo e intensidad
export const EXERCISE_MET: Record<ExerciseType, Record<ExerciseIntensity, number>> = {
  walking: { light: 2.5, moderate: 3.5, intense: 5.0 },
  running: { light: 6.0, moderate: 9.0, intense: 12.0 },
  cycling: { light: 4.0, moderate: 6.0, intense: 10.0 },
  swimming: { light: 4.0, moderate: 6.0, intense: 8.0 },
  weights: { light: 3.0, moderate: 4.5, intense: 6.0 },
  yoga: { light: 2.0, moderate: 3.0, intense: 4.0 },
  dancing: { light: 3.0, moderate: 4.5, intense: 6.0 },
  sports: { light: 4.0, moderate: 6.0, intense: 10.0 },
  other: { light: 3.0, moderate: 4.5, intense: 6.0 },
};

// ─── Contextos de Glucosa ─────────────────────────────────────────────────────
export const GLUCOSE_CONTEXT_LABELS: Record<string, string> = {
  fasting: 'Ayunas',
  before_breakfast: 'Antes del desayuno',
  after_breakfast: 'Después del desayuno',
  before_lunch: 'Antes del almuerzo',
  after_lunch: 'Después del almuerzo',
  before_dinner: 'Antes de la cena',
  after_dinner: 'Después de la cena',
  before_sleep: 'Antes de dormir',
  night: 'Nocturna',
  exercise: 'Ejercicio',
  random: 'Aleatoria',
};

// ─── Tipos de Insulina ────────────────────────────────────────────────────────
export const INSULIN_TYPE_LABELS: Record<string, string> = {
  rapid: 'Acción rápida',
  short: 'Acción corta',
  intermediate: 'Acción intermedia',
  long: 'Acción larga (basal)',
  ultra_long: 'Acción ultra larga',
  mixed: 'Premezclada',
  inhaled: 'Inhalada',
};

export const INSULIN_SITE_LABELS: Record<string, string> = {
  abdomen: 'Abdomen',
  arm_left: 'Brazo izquierdo',
  arm_right: 'Brazo derecho',
  thigh_left: 'Muslo izquierdo',
  thigh_right: 'Muslo derecho',
  buttock_left: 'Glúteo izquierdo',
  buttock_right: 'Glúteo derecho',
};

// ─── Tipos de Diabetes ────────────────────────────────────────────────────────
export const DIABETES_TYPE_LABELS: Record<string, string> = {
  type1: 'Diabetes tipo 1',
  type2: 'Diabetes tipo 2',
  gestational: 'Diabetes gestacional',
  lada: 'LADA',
  mody: 'MODY',
  prediabetes: 'Prediabetes',
  other: 'Otro',
};

// ─── Tipos de Comida ──────────────────────────────────────────────────────────
export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Colación',
  other: 'Otro',
};

// ─── Bloqueo automático ───────────────────────────────────────────────────────
export const AUTO_LOCK_OPTIONS = [
  { value: 0, label: 'Nunca' },
  { value: 1, label: '1 minuto' },
  { value: 5, label: '5 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
] as const;

// ─── Versiones BD ─────────────────────────────────────────────────────────────
export const DB_NAME = 'glucontrol_db';
export const DB_VERSION = 1;

// ─── Clave para cifrado de respaldos ─────────────────────────────────────────
export const BACKUP_SALT = 'glucontrol_backup_v1';

// ─── Formato de fechas ────────────────────────────────────────────────────────
export const DATE_FORMAT = 'yyyy-MM-dd';
export const TIME_FORMAT = 'HH:mm:ss';
export const DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";
export const DISPLAY_DATE_FORMAT = 'dd/MM/yyyy';
export const DISPLAY_TIME_FORMAT = 'HH:mm';
export const DISPLAY_DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';

// ─── HbA1c estimada ───────────────────────────────────────────────────────────
// Fórmula: HbA1c (%) = (Promedio glucosa mg/dL + 46.7) / 28.7
export const HBA1C_FORMULA = {
  OFFSET: 46.7,
  DIVISOR: 28.7,
} as const;

// ─── Configuración por defecto ────────────────────────────────────────────────
export const DEFAULT_SETTINGS = {
  glucoseUnit: 'mg/dL' as const,
  glucoseTargetMin: 80,
  glucoseTargetMax: 180,
  glucoseHypoThreshold: 70,
  glucoseHyperThreshold: 180,
  glucoseSevereHypoThreshold: 54,
  glucoseSevereHyperThreshold: 400,
  weightUnit: 'kg' as const,
  bpSystolicMax: 120,
  bpDiastolicMax: 80,
  theme: 'dark' as const,
  language: 'es' as const,
  pinEnabled: false,
  biometricEnabled: false,
  autoLockMinutes: 5,
  notificationsEnabled: true,
  backupCount: 0,
} as const;

// ─── Alias EXERCISE_TYPE_LABELS (alias de EXERCISE_TYPES) ────────────────────
export const EXERCISE_TYPE_LABELS: Record<string, string> = {
  walking: 'Caminar',
  running: 'Correr',
  cycling: 'Ciclismo',
  swimming: 'Natación',
  weights: 'Pesas',
  yoga: 'Yoga',
  dancing: 'Baile',
  sports: 'Deportes',
  aerobic: 'Aeróbico',
  anaerobic: 'Anaeróbico',
  other: 'Otro',
};

// ─── Recordatorios ───────────────────────────────────────────────────────────
export const REMINDER_TYPE_LABELS: Record<string, string> = {
  glucose: 'Glucosa',
  medication: 'Medicamento',
  insulin: 'Insulina',
  meal: 'Comida',
  exercise: 'Ejercicio',
  weight: 'Peso',
  blood_pressure: 'Presión arterial',
  custom: 'Personalizado',
};

// ─── Periodos de estadísticas ─────────────────────────────────────────────────
export const PERIOD_LABELS: Record<string, string> = {
  day: 'Hoy',
  week: '7 días',
  month: '30 días',
  '3months': '3 meses',
  '6months': '6 meses',
  year: '1 año',
  all: 'Todo',
};
