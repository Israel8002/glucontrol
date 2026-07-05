import type {
  BaseRecord,
  GlucoseUnit,
  GlucoseContext,
  GlucoseStatus,
  InsulinType,
  InsulinSite,
  MealType,
  ExerciseIntensity,
  ExerciseType,
  BloodPressureCategory,
  BMICategory,
  DiabetesType,
  ReminderFrequency,
  ReminderModule,
  WeightUnit,
  AppTheme,
  AppLanguage,
} from '@/types';

/**
 * Perfil del paciente (registro único)
 */
export interface Patient extends BaseRecord {
  name: string;
  lastName: string;
  birthDate: string;          // YYYY-MM-DD
  diabetesType: DiabetesType;
  diagnosisDate?: string;     // YYYY-MM-DD
  doctorName?: string;
  doctorPhone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  height: number;             // en cm
  bloodType?: string;         // A+, B-, O+, etc.
  notes?: string;
}

/**
 * Lectura de glucosa
 */
export interface GlucoseReading extends BaseRecord {
  value: number;              // Valor en mg/dL (siempre almacenado en mg/dL)
  unit: GlucoseUnit;          // Unidad en que fue ingresado
  context: GlucoseContext;
  status: GlucoseStatus;      // Calculado automáticamente
  notes?: string;
  // Fecha/hora de la medición (puede ser diferente a createdAt si se edita)
  readingDate: string;        // YYYY-MM-DD
  readingTime: string;        // HH:mm
}

/**
 * Medicamento (catálogo personal del paciente)
 */
export interface Medication extends BaseRecord {
  name: string;
  genericName?: string;
  dosage: string;             // e.g. "500mg", "5mg/mL"
  form: string;               // "tableta", "cápsula", "inyectable", "jarabe"
  frequency: string;          // "cada 8h", "cada 12h", "una vez al día"
  scheduledTimes: string[];   // Horarios programados ["08:00", "20:00"]
  notes?: string;
  color?: string;             // Color identificador para la UI
  reminderEnabled: boolean;
}

/**
 * Registro de toma de medicamento
 */
export interface MedicationLog extends BaseRecord {
  medicationId: string;
  taken: boolean;
  scheduledTime: string;      // HH:mm
  takenTime?: string;         // HH:mm (cuando realmente se tomó)
  logDate: string;            // YYYY-MM-DD
  notes?: string;
  skippedReason?: string;
}

/**
 * Tipo de insulina (catálogo personal)
 */
export interface InsulinTypeRecord extends BaseRecord {
  name: string;               // "Lantus", "Humalog", "NovoRapid"
  type: InsulinType;
  units: number;              // Dosis estándar del paciente
  color?: string;
  notes?: string;
  defaultTime?: string;
  defaultSite?: string;
}

/**
 * Registro de dosis de insulina
 */
export interface InsulinLog extends BaseRecord {
  insulinId: string;
  units: number;
  site: InsulinSite;
  type: InsulinType;
  logDate: string;
  logTime: string;
  glucoseReadingId?: string;  // Glucosa asociada (bólus corrección)
  correctionDose: boolean;
  notes?: string;
}

/**
 * Registro de comida
 */
export interface MealLog extends BaseRecord {
  mealType: MealType;
  description: string;
  carbohydrates?: number;     // gramos de carbohidratos
  calories?: number;
  glycemicIndex?: number;
  logDate: string;
  logTime: string;
  preGlucoseId?: string;      // Glucosa antes de la comida
  postGlucoseId?: string;     // Glucosa 2h después
  notes?: string;
  photoPath?: string;         // Ruta a foto guardada localmente
}

/**
 * Registro de nutrición (versión extendida de MealLog)
 */
export interface NutritionLog extends BaseRecord {
  foodName: string;           // Nombre del alimento
  mealType: MealType;
  calories?: number;
  carbs?: number;             // gramos de carbohidratos
  protein?: number;           // gramos de proteína
  fat?: number;               // gramos de grasa
  portionSize?: number;       // tamaño de porción
  portionUnit?: string;       // unidad de porción (g, ml, porciones)
  glycemicIndex?: number;
  logDate: string;
  logTime: string;
  notes?: string;
}

/**
 * Registro de ejercicio
 */
export interface ExerciseLog extends BaseRecord {
  type: ExerciseType;
  name?: string;              // Nombre descriptivo (ej: "Caminata")
  customType?: string;        // Si type === 'other'
  intensity: ExerciseIntensity;
  duration: number;           // Alias de durationMinutes (minutos)
  durationMinutes: number;    // Campo original para compatibilidad
  caloriesBurned?: number;    // Estimado automáticamente
  heartRateAvg?: number;
  logDate: string;
  logTime: string;
  preGlucoseId?: string;
  postGlucoseId?: string;
  notes?: string;
}

/**
 * Registro de peso
 */
export interface WeightLog extends BaseRecord {
  weight: number;             // Siempre en kg internamente
  unit: WeightUnit;           // Unidad en que fue ingresado
  bmi: number;                // Calculado automáticamente
  bmiCategory: BMICategory;  // Calculado automáticamente
  logDate: string;
  logTime: string;
  notes?: string;
}

/**
 * Registro de presión arterial
 */
export interface BloodPressureLog extends BaseRecord {
  systolic: number;           // mmHg
  diastolic: number;          // mmHg
  pulse?: number;             // lpm
  category: BloodPressureCategory; // Calculado automáticamente
  arm: 'left' | 'right';
  position: 'sitting' | 'standing' | 'lying';
  logDate: string;
  logTime: string;
  notes?: string;
}

/**
 * Recordatorio configurado
 */
export interface Reminder extends BaseRecord {
  title: string;
  module?: ReminderModule;    // Módulo original
  type?: string;              // Tipo legible (para página de recordatorios)
  time: string;               // HH:mm
  frequency?: ReminderFrequency;
  repeatPattern?: string;     // 'daily' | 'weekly' | 'once'
  customDays?: number[];      // 0=Dom, 1=Lun, ..., 6=Sáb
  days?: number[];            // Alias de customDays
  enabled?: boolean;          // Campo original
  isActive?: boolean;         // Alias usado en UI
  notificationId?: number;    // ID de notificación local
  relatedId?: string;         // ID del medicamento/insulina asociado
  sound?: boolean;
  vibration?: boolean;
  lastTriggered?: string;
  nextTrigger?: string;
}

/**
 * Historial de recordatorios activados
 */
export interface ReminderHistory extends BaseRecord {
  reminderId: string;
  triggeredAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  action?: 'taken' | 'skipped' | 'snoozed';
}

/**
 * Configuración de la aplicación
 */
export interface AppSettings extends BaseRecord {
  // Glucosa
  glucoseUnit: GlucoseUnit;
  glucoseTargetMin: number;   // mg/dL
  glucoseTargetMax: number;   // mg/dL
  glucoseHypoThreshold: number;  // default 70
  glucoseHyperThreshold: number; // default 180
  glucoseSevereHypoThreshold: number;  // default 54
  glucoseSevereHyperThreshold: number; // default 400
  
  // Peso
  weightUnit: WeightUnit;
  
  // Presión Arterial
  bpSystolicMax?: number;
  bpDiastolicMax?: number;
  
  // UI
  theme: AppTheme;
  language: AppLanguage;
  
  // Seguridad
  pinEnabled: boolean;
  pinHash?: string;           // SHA-256 del PIN
  biometricEnabled: boolean;
  autoLockMinutes: number;    // 0 = sin bloqueo automático
  
  // Notificaciones
  notificationsEnabled: boolean;
  
  // Backup
  lastBackupDate?: string;
  lastBackupAt?: string;      // ISO string del último backup
  backupCount: number;
  backupPasswordHash?: string; // SHA-256 de la clave de respaldo
  backupPasswordHint?: string; // Recordatorio/pista de la clave
}

/**
 * Historial de respaldos
 */
export interface BackupHistory extends BaseRecord {
  filename: string;
  sizeBytes: number;
  recordCount: number;
  type: 'manual' | 'auto';
  notes?: string;
}

/**
 * Estadísticas calculadas (no persistidas, calculadas en tiempo real)
 */
export interface GlucoseStats {
  average: number;
  min: number;
  max: number;
  standardDeviation: number;
  coefficientOfVariation: number;
  estimatedHbA1c: number;
  timeInRange: number;        // porcentaje 0-100
  timeInHypo: number;         // porcentaje
  timeInSevereHypo: number;   // porcentaje
  timeInHyper: number;        // porcentaje
  timeInSevereHyper: number;  // porcentaje
  totalReadings: number;
  readingsPerDay: number;
  hypoCount: number;
  hyperCount: number;
  period: string;
}

/**
 * Datos para gráfica de glucosa
 */
export interface GlucoseChartPoint {
  timestamp: number;
  date: string;
  time: string;
  value: number;
  status: GlucoseStatus;
  context: GlucoseContext;
}
