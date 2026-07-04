import Dexie, { type Table } from 'dexie';
import type {
  Patient,
  GlucoseReading,
  Medication,
  MedicationLog,
  InsulinTypeRecord,
  InsulinLog,
  MealLog,
  NutritionLog,
  ExerciseLog,
  WeightLog,
  BloodPressureLog,
  Reminder,
  ReminderHistory,
  AppSettings,
  BackupHistory,
} from '@/entities';
import { DB_NAME, DB_VERSION } from '@/core/constants';
import { logger } from '@/core/logger';

/**
 * Base de datos principal de GluControl usando Dexie (IndexedDB).
 * 
 * La capa de repositorios abstrae completamente el acceso a esta clase,
 * permitiendo migrar a SQLite (Capacitor) en el futuro sin cambiar la
 * lógica de negocio.
 * 
 * Índices por tabla:
 * - Todos tienen: id, createdAt, timestamp, isDeleted
 * - Registros médicos: readingDate/logDate para filtrar por fecha
 */
class GluControlDatabase extends Dexie {
  patients!: Table<Patient, string>;
  glucoseReadings!: Table<GlucoseReading, string>;
  medications!: Table<Medication, string>;
  medicationLogs!: Table<MedicationLog, string>;
  insulinTypes!: Table<InsulinTypeRecord, string>;
  insulinLogs!: Table<InsulinLog, string>;
  mealLogs!: Table<MealLog, string>;
  nutritionLogs!: Table<NutritionLog, string>;
  exerciseLogs!: Table<ExerciseLog, string>;
  weightLogs!: Table<WeightLog, string>;
  bloodPressureLogs!: Table<BloodPressureLog, string>;
  reminders!: Table<Reminder, string>;
  reminderHistory!: Table<ReminderHistory, string>;
  // settings es el nombre de store; appSettings es un getter alias
  settings!: Table<AppSettings, string>;
  backupHistory!: Table<BackupHistory, string>;
  errorLogs!: Table<Record<string, unknown>, string>;

  constructor() {
    super(DB_NAME);
    
    this.version(DB_VERSION).stores({
      // Paciente
      patients: 'id, createdAt, timestamp, isDeleted',
      
      // Glucosa — índice por fecha para consultas históricas eficientes
      glucoseReadings: 'id, readingDate, timestamp, isDeleted, context, status',
      
      // Medicamentos
      medications: 'id, name, createdAt, isDeleted, isActive',
      medicationLogs: 'id, medicationId, logDate, timestamp, isDeleted',
      
      // Insulina
      insulinTypes: 'id, name, type, isDeleted, isActive',
      insulinLogs: 'id, insulinId, logDate, timestamp, isDeleted',
      
      // Otros registros médicos
      mealLogs: 'id, logDate, mealType, timestamp, isDeleted',
      nutritionLogs: 'id, logDate, mealType, timestamp, isDeleted',
      exerciseLogs: 'id, logDate, type, timestamp, isDeleted',
      weightLogs: 'id, logDate, timestamp, isDeleted',
      bloodPressureLogs: 'id, logDate, timestamp, isDeleted',
      
      // Recordatorios
      reminders: 'id, module, enabled, isDeleted',
      reminderHistory: 'id, reminderId, triggeredAt, isDeleted',
      
      // Configuración y respaldos
      settings: 'id, createdAt',
      backupHistory: 'id, createdAt, timestamp, isDeleted',
      errorLogs: 'id, createdAt, timestamp',
    });
    
    // Hooks de base de datos para logging
    this.on('ready', () => {
      logger.info('Base de datos lista', undefined, 'Database');
    });
  }

  /** Alias de settings para compatibilidad */
  get appSettings() { return this.settings; }
}

// Singleton de la base de datos
export const db = new GluControlDatabase();

// Inicialización y verificación de apertura
db.open().catch((error: unknown) => {
  logger.error('Error al abrir la base de datos', error, 'Database');
});

export default db;
