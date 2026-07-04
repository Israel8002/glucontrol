/**
 * Tipos base para todos los registros de la base de datos.
 * Estos campos son internos y nunca se muestran al usuario.
 */
export interface BaseRecord {
  /** UUID v4 generado automáticamente */
  id: string;
  /** Fecha de creación ISO 8601 (YYYY-MM-DD) */
  createdAt: string;
  /** Hora de creación (HH:mm:ss) */
  createdTime: string;
  /** Fecha de última modificación ISO 8601 */
  updatedAt: string;
  /** Hora de última modificación (HH:mm:ss) */
  updatedTime: string;
  /** Zona horaria del dispositivo (e.g. "America/Mexico_City") */
  timezone: string;
  /** Timestamp Unix en milisegundos */
  timestamp: number;
  /** Versión del registro (optimistic locking) */
  version: number;
  /** Si el registro está activo */
  isActive: boolean;
  /** Eliminación lógica (true = eliminado) */
  isDeleted: boolean;
}

/** Unidades de glucosa */
export type GlucoseUnit = 'mg/dL' | 'mmol/L';

/** Unidades de peso */
export type WeightUnit = 'kg' | 'lb';

/** Contexto de medición de glucosa */
export type GlucoseContext =
  | 'fasting'           // Ayunas
  | 'before_breakfast'  // Antes del desayuno
  | 'after_breakfast'   // Después del desayuno (2h)
  | 'before_lunch'      // Antes del almuerzo
  | 'after_lunch'       // Después del almuerzo (2h)
  | 'before_dinner'     // Antes de la cena
  | 'after_dinner'      // Después de la cena (2h)
  | 'before_sleep'      // Antes de dormir
  | 'night'             // Nocturna
  | 'exercise'          // Ejercicio
  | 'random';           // Aleatoria

/** Estado clínico de la glucosa */
export type GlucoseStatus =
  | 'severe_hypo'    // Hipoglucemia severa (< 54 mg/dL)
  | 'hypo'           // Hipoglucemia (54–70 mg/dL)
  | 'low'            // Baja (70–80 mg/dL)
  | 'normal'         // Normal (en rango objetivo)
  | 'high'           // Alta (por encima del objetivo)
  | 'hyper'          // Hiperglucemia (> 250 mg/dL)
  | 'severe_hyper';  // Hiperglucemia severa (> 400 mg/dL)

/** Tipo de insulina */
export type InsulinType =
  | 'rapid'          // Rápida (análogo de acción rápida)
  | 'short'          // Regular / Rápida humana
  | 'intermediate'   // NPH / Intermedia
  | 'long'           // Larga duración (basal)
  | 'ultra_long'     // Ultra larga duración
  | 'mixed'          // Premezclada
  | 'inhaled';       // Inhalada

/** Zona de aplicación de insulina */
export type InsulinSite =
  | 'abdomen'
  | 'arm_left'
  | 'arm_right'
  | 'thigh_left'
  | 'thigh_right'
  | 'buttock_left'
  | 'buttock_right';

/** Tipo de comida */
export type MealType =
  | 'breakfast'   // Desayuno
  | 'lunch'       // Almuerzo / Comida
  | 'dinner'      // Cena
  | 'snack'       // Colación / Merienda
  | 'other';      // Otro

/** Intensidad de ejercicio */
export type ExerciseIntensity = 'light' | 'moderate' | 'intense';

/** Tipo de ejercicio */
export type ExerciseType =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'weights'
  | 'yoga'
  | 'dancing'
  | 'sports'
  | 'other';

/** Clasificación de presión arterial */
export type BloodPressureCategory =
  | 'normal'           // < 120/80
  | 'elevated'         // 120-129 / < 80
  | 'stage1'           // 130-139 / 80-89
  | 'stage2'           // >= 140 / >= 90
  | 'crisis';          // > 180 / > 120

/** Clasificación de IMC */
export type BMICategory =
  | 'underweight'      // < 18.5
  | 'normal'           // 18.5–24.9
  | 'overweight'       // 25–29.9
  | 'obese_1'          // 30–34.9
  | 'obese_2'          // 35–39.9
  | 'obese_3';         // >= 40

/** Tipo de diabetes */
export type DiabetesType =
  | 'type1'
  | 'type2'
  | 'gestational'
  | 'lada'
  | 'mody'
  | 'prediabetes'
  | 'other';

/** Frecuencia de recordatorio */
export type ReminderFrequency =
  | 'once'
  | 'daily'
  | 'weekdays'        // Lunes–Viernes
  | 'weekends'        // Sábado–Domingo
  | 'custom';         // Días específicos

/** Módulo al que pertenece el recordatorio */
export type ReminderModule =
  | 'glucose'
  | 'medication'
  | 'insulin'
  | 'meal'
  | 'exercise'
  | 'weight'
  | 'blood_pressure'
  | 'custom';

/** Periodo de estadísticas */
export type StatsPeriod = 'day' | 'week' | 'month' | '3months' | '6months' | 'year' | 'all';

/** Tema visual */
export type AppTheme = 'dark' | 'light';

/** Idioma de la aplicación */
export type AppLanguage = 'es' | 'en';

/** Estado de autenticación */
export type AuthStatus = 'locked' | 'unlocked' | 'no_pin';

/** Método de desbloqueo */
export type UnlockMethod = 'pin' | 'biometric' | 'none';

/** Estado de la PWA (instalación) */
export type PWAInstallStatus = 'installed' | 'installable' | 'not_installable';

/** Alias de ReminderModule para compatibilidad con páginas */
export type ReminderType = ReminderModule;

/** Alias de ExerciseIntensity con valor adicional */
export type ExerciseIntensityExtended = ExerciseIntensity | 'low' | 'high';
